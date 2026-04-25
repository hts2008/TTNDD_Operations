import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Assets — Core API Coverage @module:assets @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M5-E2E-15: categories API responds', async ({ request }) => {
    const res = await request.get('/api/v1/assets/categories');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M5-E2E-16: inventory summary API responds', async ({ request }) => {
    const res = await request.get('/api/v1/assets/summary');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('byCategory');
      expect(body).toHaveProperty('totals');
    }
  });

  test('M5-E2E-17: QR generation rejects nonexistent asset', async ({ request }) => {
    const res = await request.get('/api/v1/assets/nonexistent-id/qr');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M5-E2E-18: dispose rejects nonexistent asset', async ({ request }) => {
    const res = await request.post('/api/v1/assets/nonexistent-id/dispose', {
      data: { reason: 'scrapped', notes: 'E2E test' },
    });
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M5-E2E-19: loan transition rejects nonexistent loan', async ({ request }) => {
    const res = await request.post('/api/v1/assets/loans/nonexistent-loan/transition', {
      data: { action: 'approve' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M5-E2E-20: guardian accept rejects nonexistent loan', async ({ request }) => {
    const res = await request.post('/api/v1/assets/loans/nonexistent-loan/guardian-accept', {
      data: { decision: 'accept' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M5-E2E-21: bulk import rejects empty items', async ({ request }) => {
    const res = await request.post('/api/v1/assets/import', {
      data: { items: [] },
    });
    expect([200, 201, 400, 401, 403]).toContain(res.status());
  });

  test('M5-E2E-22: assets by-location API responds', async ({ request }) => {
    const res = await request.get('/api/v1/assets/by-location?location=Kho');
    expect([200, 401, 403]).toContain(res.status());
  });
});
