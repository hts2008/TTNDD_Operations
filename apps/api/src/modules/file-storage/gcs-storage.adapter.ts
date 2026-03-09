import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { StorageAdapter } from './storage-adapter.interface';

/**
 * Google Cloud Storage adapter — generates real v4 signed URLs.
 *
 * Uses Application Default Credentials (auto-provided by Cloud Run).
 * Env vars:
 *   GCS_PROJECT_ID  — GCP project (optional, auto-detected on Cloud Run)
 *   GCS_BUCKET_NAME — default bucket name
 */
@Injectable()
export class GcsStorageAdapter implements StorageAdapter {
  readonly name = 'gcs';
  private readonly logger = new Logger(GcsStorageAdapter.name);
  private readonly storage: Storage;

  constructor() {
    const projectId = process.env.GCS_PROJECT_ID;
    this.storage = projectId ? new Storage({ projectId }) : new Storage();
    this.logger.log(`GCS adapter initialized (project: ${projectId || 'auto-detect'})`);
  }

  async generateUploadUrl(
    bucketName: string,
    objectKey: string,
    mimeType: string,
    options?: { retentionTtlSeconds?: number },
  ): Promise<{ uploadUrl: string; expiresAt: Date }> {
    const expiresMs = 15 * 60 * 1000; // 15 minutes
    const expiresAt = new Date(Date.now() + expiresMs);

    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(objectKey);

    const metadata: Record<string, string> = {};
    if (options?.retentionTtlSeconds) {
      metadata['x-goog-meta-retention-ttl'] = String(options.retentionTtlSeconds);
    }

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAt,
      contentType: mimeType,
      extensionHeaders: metadata,
    });

    this.logger.debug(
      `[GCS] Upload URL generated: ${objectKey} (expires: ${expiresAt.toISOString()})`,
    );
    return { uploadUrl, expiresAt };
  }

  async generateDownloadUrl(
    bucketName: string,
    objectKey: string,
    options?: { ttlSeconds?: number },
  ): Promise<{ downloadUrl: string; expiresAt: Date }> {
    const ttlMs = (options?.ttlSeconds ?? 3600) * 1000; // default 1 hour
    const expiresAt = new Date(Date.now() + ttlMs);

    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(objectKey);

    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expiresAt,
    });

    this.logger.debug(
      `[GCS] Download URL generated: ${objectKey} (expires: ${expiresAt.toISOString()})`,
    );
    return { downloadUrl, expiresAt };
  }

  async deleteObject(bucketName: string, objectKey: string): Promise<void> {
    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(objectKey);

    try {
      await file.delete({ ignoreNotFound: true });
      this.logger.debug(`[GCS] Object deleted: ${objectKey}`);
    } catch (error) {
      this.logger.warn(`[GCS] Failed to delete ${objectKey}: ${error}`);
      // Soft-delete in DB still succeeds; orphan cleanup via lifecycle rules
    }
  }
}
