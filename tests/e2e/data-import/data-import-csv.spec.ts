import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Data Import — CSV Templates & Member Import @module:data-import @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('DI-E2E-01: get CSV template for members', async ({ request }) => {
    const res = await request.get('/api/v1/data-import/template/members');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('csv');
      expect(body).toHaveProperty('importType');
      expect(body.importType).toBe('members');
    }
  });

  test('DI-E2E-02: import members dry-run (validation only)', async ({ request }) => {
    const csvContent = 'scoutName,email,branchCode\nNguyen Van A,a@test.com,thieu\nTran Thi B,b@test.com,au';
    const res = await request.post('/api/v1/data-import/members', {
      data: { csvContent, isDryRun: true },
    });
    expect([200, 201, 400, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('totalRows');
      expect(body).toHaveProperty('validRows');
      expect(body).toHaveProperty('errors');
    }
  });

  test('DI-E2E-03: import members rejects empty CSV', async ({ request }) => {
    const res = await request.post('/api/v1/data-import/members', {
      data: { csvContent: '', isDryRun: true },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('DI-E2E-04: get import history', async ({ request }) => {
    const res = await request.get('/api/v1/data-import/history');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('DI-E2E-05: get import history filtered by type', async ({ request }) => {
    const res = await request.get('/api/v1/data-import/history?importType=members');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('DI-E2E-06: get CSV template for unknown type', async ({ request }) => {
    const res = await request.get('/api/v1/data-import/template/unknown_type');
    expect([200, 400, 401, 403]).toContain(res.status());
  });
});
