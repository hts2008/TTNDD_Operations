import { Injectable, BadRequestException, NotFoundException, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database';
import { StorageAdapter, STORAGE_ADAPTER } from './storage-adapter.interface';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/zip',
];

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/** Retention TTL in seconds per entity type (T-0034) */
const RETENTION_TTL_MAP: Record<string, number> = {
  avatar: 365 * 24 * 3600, // 1 year
  evidence: 3 * 365 * 24 * 3600, // 3 years (compliance)
  document: 365 * 24 * 3600, // 1 year
  export: 7 * 24 * 3600, // 7 days (temporary)
  general: 90 * 24 * 3600, // 90 days (default)
};

export interface SignedUploadUrlResult {
  fileRefId: string;
  uploadUrl: string;
  objectKey: string;
  expiresAt: Date;
}

export interface SignedDownloadUrlResult {
  downloadUrl: string;
  expiresAt: Date;
  originalName: string;
  mimeType: string;
}

export interface FinalizeUploadResult {
  fileRefId: string;
  status: 'READY' | 'INFECTED' | 'FAILED';
  scanStatus: 'CLEAN' | 'INFECTED' | 'FAILED';
  checksum?: string | null;
  finalizedAt?: Date | null;
}

export interface CreateUploadRequestDto {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  entityType?: string;
  entityId?: string;
}

export interface FinalizeUploadDto {
  fileRefId: string;
  objectKey: string;
  checksum?: string;
  sizeBytes: number;
}

type LocalStorageAdapterMethods = StorageAdapter & {
  putLocalObject?: (objectKey: string, buffer: Buffer, mimeType: string) => Promise<void>;
  getLocalObject?: (
    objectKey: string,
  ) => Promise<{ buffer: Buffer; mimeType: string; uploadedAt: Date } | null>;
};

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_ADAPTER) private readonly storageAdapter: StorageAdapter,
  ) {
    this.logger.log(`FileStorageService using adapter: ${this.storageAdapter.name}`);
  }

  async createUploadRequest(
    orgId: string,
    uploaderUserId: string,
    params: CreateUploadRequestDto,
  ): Promise<SignedUploadUrlResult> {
    if (!ALLOWED_MIME_TYPES.includes(params.mimeType)) {
      throw new BadRequestException(`MIME type not allowed: ${params.mimeType}`);
    }
    if (!Number.isFinite(params.sizeBytes) || params.sizeBytes <= 0) {
      throw new BadRequestException('File size must be a positive number');
    }
    if (params.sizeBytes > MAX_SIZE_BYTES) {
      throw new BadRequestException(`File size exceeds 50MB limit`);
    }

    const bucketName = process.env.GCS_BUCKET_NAME || 'ttndd-ops-files';
    const timestamp = Date.now();
    const safeName = params.originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `${orgId}/${params.entityType || 'general'}/${timestamp}-${safeName}`;

    const retentionTtlSeconds =
      RETENTION_TTL_MAP[params.entityType || 'general'] ?? RETENTION_TTL_MAP.general;

    const { uploadUrl, expiresAt } = await this.storageAdapter.generateUploadUrl(
      bucketName,
      objectKey,
      params.mimeType,
      { retentionTtlSeconds },
    );

    const fileRef = await this.prisma.fileObjectRef.create({
      data: {
        orgId,
        uploaderUserId,
        bucketName,
        objectKey,
        originalName: params.originalName,
        mimeType: params.mimeType,
        sizeBytes: BigInt(params.sizeBytes),
        entityType: params.entityType,
        entityId: params.entityId,
        isPublic: false,
      },
    });

    return { fileRefId: fileRef.id, uploadUrl, objectKey, expiresAt };
  }

  async finalizeUpload(
    orgId: string,
    _userId: string,
    params: FinalizeUploadDto,
  ): Promise<FinalizeUploadResult> {
    if (!params.fileRefId) {
      throw new BadRequestException('fileRefId is required');
    }
    if (!params.objectKey) {
      throw new BadRequestException('objectKey is required');
    }
    if (!Number.isFinite(params.sizeBytes) || params.sizeBytes <= 0) {
      throw new BadRequestException('File size must be a positive number');
    }
    if (params.sizeBytes > MAX_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds 50MB limit');
    }

    const checksum = this.normalizeChecksum(params.checksum);
    const fileRef = await this.prisma.fileObjectRef.findFirst({
      where: { id: params.fileRefId, orgId, deletedAt: null },
    });
    if (!fileRef) throw new NotFoundException('File not found');

    if (fileRef.status === 'INFECTED' || fileRef.status === 'FAILED') {
      throw new BadRequestException(`File is already marked ${fileRef.status}`);
    }

    if (fileRef.objectKey !== params.objectKey) {
      await this.markFinalizeFailed(fileRef.id, 'object_key_mismatch');
      throw new BadRequestException('objectKey does not match the upload request');
    }

    const expectedSize = Number(fileRef.sizeBytes);
    if (expectedSize !== params.sizeBytes) {
      await this.markFinalizeFailed(fileRef.id, 'size_mismatch');
      throw new BadRequestException('sizeBytes does not match the upload request');
    }

    if (fileRef.status === 'READY') {
      if (checksum && fileRef.checksum && checksum !== fileRef.checksum) {
        throw new BadRequestException('checksum does not match the finalized file');
      }
      return {
        fileRefId: fileRef.id,
        status: 'READY',
        scanStatus: fileRef.scanStatus === 'CLEAN' ? 'CLEAN' : 'FAILED',
        checksum: fileRef.checksum,
        finalizedAt: fileRef.finalizedAt,
      };
    }

    const scanResult = await this.scanFinalizedObject(fileRef.bucketName, fileRef.objectKey);
    const updated = await this.prisma.fileObjectRef.update({
      where: { id: fileRef.id },
      data: {
        status: scanResult.status,
        scanStatus: scanResult.scanStatus,
        scanError: scanResult.scanError,
        checksum,
        finalizedAt: scanResult.status === 'READY' ? new Date() : null,
      },
    });

    return {
      fileRefId: updated.id,
      status: updated.status as FinalizeUploadResult['status'],
      scanStatus: updated.scanStatus as FinalizeUploadResult['scanStatus'],
      checksum: updated.checksum,
      finalizedAt: updated.finalizedAt,
    };
  }

  async assertReadyFileRefs(orgId: string, fileRefIds?: Array<string | null | undefined>) {
    const uniqueIds = Array.from(new Set((fileRefIds ?? []).filter(Boolean))) as string[];
    if (uniqueIds.length === 0) return [];

    const refs = await this.prisma.fileObjectRef.findMany({
      where: {
        orgId,
        id: { in: uniqueIds },
        deletedAt: null,
      },
    });

    const found = new Set(refs.map((ref) => ref.id));
    const missing = uniqueIds.filter((fileRefId) => !found.has(fileRefId));
    if (missing.length > 0) {
      throw new BadRequestException(`File reference not found: ${missing.join(', ')}`);
    }

    const notReady = refs.find((ref) => ref.status !== 'READY');
    if (notReady) {
      throw new BadRequestException(
        `File reference ${notReady.id} is not READY (status=${notReady.status})`,
      );
    }

    return refs;
  }

  async getDownloadUrl(orgId: string, fileRefId: string): Promise<SignedDownloadUrlResult> {
    const fileRef = await this.prisma.fileObjectRef.findFirst({
      where: { id: fileRefId, orgId, deletedAt: null },
    });
    if (!fileRef) throw new NotFoundException('File not found');
    if (fileRef.status !== 'READY') {
      throw new BadRequestException(`File is not ready for download (status=${fileRef.status})`);
    }

    const { downloadUrl, expiresAt } = await this.storageAdapter.generateDownloadUrl(
      fileRef.bucketName,
      fileRef.objectKey,
    );

    return {
      downloadUrl,
      expiresAt,
      originalName: fileRef.originalName,
      mimeType: fileRef.mimeType,
    };
  }

  async listFiles(orgId: string, entityType?: string, entityId?: string) {
    return this.prisma.fileObjectRef.findMany({
      where: {
        orgId,
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
        deletedAt: null,
      },
      orderBy: { uploadedAt: 'desc' },
      take: 50,
    });
  }

  async acceptLocalUpload(encodedKey: string, stream: NodeJS.ReadableStream, mimeType?: string) {
    const adapter = this.storageAdapter as LocalStorageAdapterMethods;
    if (!adapter.putLocalObject) {
      throw new BadRequestException(
        'Local upload endpoint is only available in local storage mode',
      );
    }

    const objectKey = this.decodeLocalObjectKey(encodedKey);
    const buffer = await this.readStream(stream);
    await adapter.putLocalObject(objectKey, buffer, mimeType || 'application/octet-stream');

    return { objectKey, sizeBytes: buffer.length };
  }

  async getLocalObject(encodedKey: string) {
    const adapter = this.storageAdapter as LocalStorageAdapterMethods;
    if (!adapter.getLocalObject) {
      throw new BadRequestException(
        'Local download endpoint is only available in local storage mode',
      );
    }

    const objectKey = this.decodeLocalObjectKey(encodedKey);
    const object = await adapter.getLocalObject(objectKey);
    if (!object) throw new NotFoundException('Local object not found');
    return { objectKey, ...object };
  }

  async softDelete(orgId: string, fileRefId: string): Promise<void> {
    const fileRef = await this.prisma.fileObjectRef.findFirst({
      where: { id: fileRefId, orgId, deletedAt: null },
    });
    if (!fileRef) throw new NotFoundException('File not found');

    // Optionally delete from storage backend
    await this.storageAdapter.deleteObject(fileRef.bucketName, fileRef.objectKey);

    await this.prisma.fileObjectRef.update({
      where: { id: fileRefId },
      data: { deletedAt: new Date() },
    });
  }

  private normalizeChecksum(checksum?: string): string | undefined {
    if (!checksum) return undefined;
    const normalized = checksum.trim();
    if (!normalized) return undefined;
    if (normalized.length > 128) {
      throw new BadRequestException('checksum must be 128 characters or less');
    }
    if (!/^[a-zA-Z0-9:+/=_-]+$/.test(normalized)) {
      throw new BadRequestException('checksum contains unsupported characters');
    }
    return normalized;
  }

  private decodeLocalObjectKey(encodedKey: string) {
    try {
      const objectKey = Buffer.from(encodedKey, 'base64url').toString('utf8');
      if (!objectKey || objectKey.includes('\0')) {
        throw new Error('invalid object key');
      }
      return objectKey;
    } catch {
      throw new BadRequestException('Invalid local object key');
    }
  }

  private readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  private async markFinalizeFailed(fileRefId: string, reason: string): Promise<void> {
    try {
      await this.prisma.fileObjectRef.update({
        where: { id: fileRefId },
        data: {
          status: 'FAILED',
          scanStatus: 'FAILED',
          scanError: reason,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to mark file finalize failure for ${fileRefId}: ${(error as Error).message}`,
      );
    }
  }

  private async scanFinalizedObject(
    _bucketName: string,
    _objectKey: string,
  ): Promise<{
    status: 'READY' | 'INFECTED' | 'FAILED';
    scanStatus: 'CLEAN' | 'INFECTED' | 'FAILED';
    scanError?: string | null;
  }> {
    return {
      status: 'READY',
      scanStatus: 'CLEAN',
      scanError: null,
    };
  }
}
