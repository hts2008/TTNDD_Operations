import { Injectable, Logger } from '@nestjs/common';
import { StorageAdapter } from './storage-adapter.interface';

/**
 * Local storage adapter — generates mock signed URLs for local development.
 * Files are referenced by base64-encoded object keys.
 *
 * In production, replace with GcsStorageAdapter that uses
 * @google-cloud/storage v4 signed URLs.
 */
@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  readonly name = 'local-dev';
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly port = process.env.PORT || 3001;

  async generateUploadUrl(
    _bucketName: string,
    objectKey: string,
    _mimeType: string,
  ): Promise<{ uploadUrl: string; expiresAt: Date }> {
    const encodedKey = Buffer.from(objectKey).toString('base64');
    const uploadUrl = `http://localhost:${this.port}/file-storage/local-upload/${encodedKey}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    this.logger.debug(`[LOCAL] Upload URL generated: ${objectKey}`);
    return { uploadUrl, expiresAt };
  }

  async generateDownloadUrl(
    _bucketName: string,
    objectKey: string,
  ): Promise<{ downloadUrl: string; expiresAt: Date }> {
    const encodedKey = Buffer.from(objectKey).toString('base64');
    const downloadUrl = `http://localhost:${this.port}/file-storage/local-download/${encodedKey}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    this.logger.debug(`[LOCAL] Download URL generated: ${objectKey}`);
    return { downloadUrl, expiresAt };
  }

  async deleteObject(_bucketName: string, objectKey: string): Promise<void> {
    this.logger.debug(`[LOCAL] Object deleted (mock): ${objectKey}`);
    // In local mode, no actual file deletion — metadata only
  }
}
