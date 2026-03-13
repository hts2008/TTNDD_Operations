import { test, expect } from '@playwright/test';

test.describe('Assets — CSV Export @module:assets @gate', () => {
  test('M5-E2E-12: assets CSV export API responds', async ({ request }) => {
    const res = await request.get('/api/assets/export/csv');
    // 200 with CSV body, or 401 if auth required
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('csv');
      expect(body).toHaveProperty('filename');
      expect(body.csv).toContain('asset_code');
    }
  });

  test('M5-E2E-13: loans CSV export API responds', async ({ request }) => {
    const res = await request.get('/api/assets/loans/export/csv');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('csv');
      expect(body).toHaveProperty('filename');
      expect(body.csv).toContain('loan_id');
    }
  });

  test('M5-E2E-14: JSON export API responds', async ({ request }) => {
    const res = await request.get('/api/assets/export');
    expect([200, 401, 403]).toContain(res.status());
  });
});
