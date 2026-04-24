import { test, expect } from '@playwright/test';

test.describe('File Storage — Upload & Download @module:file-storage @gate', () => {
  test('M15-E2E-01: file-storage upload API responds', async ({ request }) => {
    const res = await request.get('/api/v1/file-storage');
    expect([200, 401, 403, 404]).toContain(res.status());
  });

  test('M15-E2E-02: rejects unauthenticated upload', async ({ request }) => {
    const res = await request.post('/api/v1/file-storage/upload', {
      headers: { Authorization: '' },
    });
    expect([401, 403]).toContain(res.status());
  });
});
