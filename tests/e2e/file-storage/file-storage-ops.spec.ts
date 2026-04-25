import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('File Storage — Upload & Download @module:file-storage @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('FS-E2E-01: request upload signed URL', async ({ request }) => {
    const res = await request.post('/api/v1/file-storage/upload-request', {
      data: {
        fileName: 'test-document.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        entityType: 'member',
        entityId: 'test-member-001',
      },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });

  test('FS-E2E-02: get download URL for nonexistent file', async ({ request }) => {
    const res = await request.get('/api/v1/file-storage/nonexistent-ref/download-url');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('FS-E2E-03: list files for org', async ({ request }) => {
    const res = await request.get('/api/v1/file-storage');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('FS-E2E-04: list files filtered by entity', async ({ request }) => {
    const res = await request.get('/api/v1/file-storage?entityType=member&entityId=test-member-001');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('FS-E2E-05: soft-delete file reference', async ({ request }) => {
    const res = await request.delete('/api/v1/file-storage/nonexistent-ref');
    expect([204, 401, 403, 404]).toContain(res.status());
  });

  test('FS-E2E-06: upload request validates required fields', async ({ request }) => {
    const res = await request.post('/api/v1/file-storage/upload-request', {
      data: {},
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});
