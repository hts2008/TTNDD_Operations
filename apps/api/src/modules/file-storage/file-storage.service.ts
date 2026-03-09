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

export interface CreateUploadRequestDto {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  entityType?: string;
  entityId?: string;
}

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
    if (params.sizeBytes > MAX_SIZE_BYTES) {
      throw new BadRequestException(`File size exceeds 50MB limit`);
    }

    const bucketName = process.env.GCS_BUCKET_NAME || 'ttndd-ops-files';
    const timestamp = Date.now();
    const safeName = params.originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `${orgId}/${params.entityType || 'general'}/${timestamp}-${safeName}`;

    const { uploadUrl, expiresAt } = await this.storageAdapter.generateUploadUrl(
      bucketName,
      objectKey,
      params.mimeType,
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

  async getDownloadUrl(orgId: string, fileRefId: string): Promise<SignedDownloadUrlResult> {
    const fileRef = await this.prisma.fileObjectRef.findFirst({
      where: { id: fileRefId, orgId, deletedAt: null },
    });
    if (!fileRef) throw new NotFoundException('File not found');

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
}
