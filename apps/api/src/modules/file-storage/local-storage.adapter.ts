import { Injectable, Logger } from '@nestjs/common';
import { StorageAdapter } from './storage-adapter.interface';

/**
 * Local storage adapter for development signed-url flows.
 * The object map is in-memory and intentionally scoped to the running API process.
 */
@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  readonly name = 'local-dev';
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly port = process.env.PORT || 3001;
  private readonly objects = new Map<
    string,
    { buffer: Buffer; mimeType: string; uploadedAt: Date }
  >();

  async generateUploadUrl(
    _bucketName: string,
    objectKey: string,
    _mimeType: string,
    _options?: { retentionTtlSeconds?: number },
  ): Promise<{ uploadUrl: string; expiresAt: Date }> {
    const encodedKey = Buffer.from(objectKey).toString('base64url');
    const uploadUrl = `http://localhost:${this.port}/api/v1/file-storage/local-upload/${encodedKey}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    this.logger.debug(`[LOCAL] Upload URL generated: ${objectKey}`);
    return { uploadUrl, expiresAt };
  }

  async generateDownloadUrl(
    _bucketName: string,
    objectKey: string,
    _options?: { ttlSeconds?: number },
  ): Promise<{ downloadUrl: string; expiresAt: Date }> {
    const encodedKey = Buffer.from(objectKey).toString('base64url');
    const downloadUrl = `http://localhost:${this.port}/api/v1/file-storage/local-download/${encodedKey}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    this.logger.debug(`[LOCAL] Download URL generated: ${objectKey}`);
    return { downloadUrl, expiresAt };
  }

  async deleteObject(_bucketName: string, objectKey: string): Promise<void> {
    this.logger.debug(`[LOCAL] Object deleted: ${objectKey}`);
    this.objects.delete(objectKey);
  }

  async putLocalObject(objectKey: string, buffer: Buffer, mimeType: string) {
    this.objects.set(objectKey, { buffer, mimeType, uploadedAt: new Date() });
    this.logger.debug(`[LOCAL] Object stored: ${objectKey} (${buffer.length} bytes)`);
  }

  async getLocalObject(objectKey: string) {
    return this.objects.get(objectKey) ?? null;
  }
}
