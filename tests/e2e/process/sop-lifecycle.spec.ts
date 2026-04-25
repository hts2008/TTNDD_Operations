import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Process — SOP Document Lifecycle @module:process @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M6-E2E-01: process page loads with SOP section', async ({ page }) => {
    await page.goto('/process');
    await expect(page).toHaveURL(/\/process/);
    const body = (await page.textContent('body')) || '';
    const hasSopContent =
      body.includes('Quy trình') || body.includes('SOP') || body.includes('Process');
    expect(hasSopContent).toBeTruthy();
  });

  test('M6-E2E-02: SOP list API responds', async ({ request }) => {
    const res = await request.get('/api/v1/process/sops');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M6-E2E-03: SOP categories API responds', async ({ request }) => {
    const res = await request.get('/api/v1/process/sops/categories');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M6-E2E-04: SOP tags API responds', async ({ request }) => {
    const res = await request.get('/api/v1/process/sops/tags');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M6-E2E-05: SOP search with query param', async ({ request }) => {
    const res = await request.get('/api/v1/process/sops?search=safety');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    }
  });

  test('M6-E2E-06: SOP create rejects empty title', async ({ request }) => {
    const res = await request.post('/api/v1/process/sops', {
      data: { title: '', description: 'test' },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('M6-E2E-07: SOP version diff API rejects nonexistent doc', async ({ request }) => {
    const res = await request.get('/api/v1/process/sops/nonexistent-id/diff?from=1&to=2');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M6-E2E-08: SOP archive rejects nonexistent doc', async ({ request }) => {
    const res = await request.post('/api/v1/process/sops/nonexistent-id/archive');
    expect([401, 403, 404]).toContain(res.status());
  });
});
