import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'video/mp4', 'video/webm',
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
  constructor(private readonly prisma: PrismaService) {}

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

    // In local dev: mock signed URL. In GCP: use @google-cloud/storage SignedUrl v4
    const uploadUrl = `http://localhost:${process.env.PORT || 3001}/file-storage/local-upload/${Buffer.from(objectKey).toString('base64')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

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

    const downloadUrl = `http://localhost:${process.env.PORT || 3001}/file-storage/local-download/${fileRefId}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

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
    await this.prisma.fileObjectRef.update({
      where: { id: fileRefId },
      data: { deletedAt: new Date() },
    });
  }
}
