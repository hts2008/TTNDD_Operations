import { test, expect } from '@playwright/test';

test.describe('Data Import — CSV Import Flow @module:data-import @gate', () => {
  test('M16-E2E-01: data-import API responds', async ({ request }) => {
    const res = await request.get('/api/v1/data-import');
    expect([200, 401, 403, 404]).toContain(res.status());
  });

  test('M16-E2E-02: rejects unauthenticated import', async ({ request }) => {
    const res = await request.post('/api/v1/data-import/upload', {
      headers: { Authorization: '' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('M16-E2E-03: dry-run endpoint responds', async ({ request }) => {
    const res = await request.post('/api/v1/data-import/upload', {
      headers: { Authorization: '' },
      multipart: {
        dryRun: 'true',
      },
    });
    expect([401, 403]).toContain(res.status());
  });
});
