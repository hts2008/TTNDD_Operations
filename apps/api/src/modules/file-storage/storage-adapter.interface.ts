/**
 * Storage adapter abstraction — Strategy pattern for file storage backends.
 *
 * DEV  = LocalStorageAdapter (mock signed URLs, filesystem)
 * PROD = GcsStorageAdapter   (Google Cloud Storage v4 signed URLs)
 *
 * Matches the MessagingAdapter pattern used for the event bus.
 */
export interface StorageAdapter {
  /**
   * Generate a signed upload URL for the given object key.
   */
  generateUploadUrl(
    bucketName: string,
    objectKey: string,
    mimeType: string,
    options?: { retentionTtlSeconds?: number },
  ): Promise<{
    uploadUrl: string;
    expiresAt: Date;
  }>;

  /**
   * Generate a signed download URL for the given object key.
   */
  generateDownloadUrl(
    bucketName: string,
    objectKey: string,
    options?: { ttlSeconds?: number },
  ): Promise<{
    downloadUrl: string;
    expiresAt: Date;
  }>;

  /**
   * Delete an object from storage.
   */
  deleteObject(bucketName: string, objectKey: string): Promise<void>;

  /**
   * Adapter name for logging.
   */
  readonly name: string;
}

export const STORAGE_ADAPTER = 'STORAGE_ADAPTER';
