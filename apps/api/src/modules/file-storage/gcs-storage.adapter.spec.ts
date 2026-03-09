import { GcsStorageAdapter } from './gcs-storage.adapter';

// Mock @google-cloud/storage
const mockGetSignedUrl = jest.fn();
const mockDelete = jest.fn();
const mockFile = jest.fn().mockReturnValue({
  getSignedUrl: mockGetSignedUrl,
  delete: mockDelete,
});
const mockBucket = jest.fn().mockReturnValue({ file: mockFile });

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: mockBucket,
  })),
}));

describe('GcsStorageAdapter', () => {
  let adapter: GcsStorageAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GCS_PROJECT_ID = 'test-project';
    adapter = new GcsStorageAdapter();
  });

  afterEach(() => {
    delete process.env.GCS_PROJECT_ID;
  });

  it('should have name "gcs"', () => {
    expect(adapter.name).toBe('gcs');
  });

  // ── generateUploadUrl ────────────────────────────────────

  describe('generateUploadUrl', () => {
    it('should generate v4 signed upload URL', async () => {
      mockGetSignedUrl.mockResolvedValue(['https://storage.googleapis.com/upload-signed']);

      const result = await adapter.generateUploadUrl(
        'test-bucket',
        'org-1/avatar/photo.jpg',
        'image/jpeg',
      );

      expect(result.uploadUrl).toBe('https://storage.googleapis.com/upload-signed');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockBucket).toHaveBeenCalledWith('test-bucket');
      expect(mockFile).toHaveBeenCalledWith('org-1/avatar/photo.jpg');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 'v4',
          action: 'write',
          contentType: 'image/jpeg',
        }),
      );
    });

    it('should pass retention metadata when provided', async () => {
      mockGetSignedUrl.mockResolvedValue(['https://storage.googleapis.com/upload-signed']);

      await adapter.generateUploadUrl(
        'test-bucket',
        'org-1/evidence/report.pdf',
        'application/pdf',
        { retentionTtlSeconds: 94608000 },
      );

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          extensionHeaders: { 'x-goog-meta-retention-ttl': '94608000' },
        }),
      );
    });
  });

  // ── generateDownloadUrl ──────────────────────────────────

  describe('generateDownloadUrl', () => {
    it('should generate v4 signed download URL', async () => {
      mockGetSignedUrl.mockResolvedValue(['https://storage.googleapis.com/download-signed']);

      const result = await adapter.generateDownloadUrl('test-bucket', 'org-1/avatar/photo.jpg');

      expect(result.downloadUrl).toBe('https://storage.googleapis.com/download-signed');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 'v4',
          action: 'read',
        }),
      );
    });

    it('should use custom TTL when provided', async () => {
      mockGetSignedUrl.mockResolvedValue(['https://storage.googleapis.com/download-signed']);

      const result = await adapter.generateDownloadUrl('test-bucket', 'org-1/export/report.xlsx', {
        ttlSeconds: 300,
      });

      // expiresAt should be ~5 min from now (300s)
      const expectedMin = Date.now() + 290 * 1000;
      const expectedMax = Date.now() + 310 * 1000;
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });

  // ── deleteObject ─────────────────────────────────────────

  describe('deleteObject', () => {
    it('should call file.delete with ignoreNotFound', async () => {
      mockDelete.mockResolvedValue(undefined);

      await adapter.deleteObject('test-bucket', 'org-1/avatar/photo.jpg');

      expect(mockBucket).toHaveBeenCalledWith('test-bucket');
      expect(mockFile).toHaveBeenCalledWith('org-1/avatar/photo.jpg');
      expect(mockDelete).toHaveBeenCalledWith({ ignoreNotFound: true });
    });

    it('should not throw on delete failure (graceful)', async () => {
      mockDelete.mockRejectedValue(new Error('Network error'));

      // Should not throw — soft-delete in DB still succeeds
      await expect(
        adapter.deleteObject('test-bucket', 'org-1/avatar/photo.jpg'),
      ).resolves.toBeUndefined();
    });
  });
});
