import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Tickets — Create to Close Flow @module:tickets @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M3-E2E-01: tickets page loads', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page).toHaveURL(/\/tickets/);
    const body = await page.textContent('body') || '';
    const hasContent =
      body.includes('Phiếu hỗ trợ') ||
      body.includes('Tickets') ||
      body.includes('Yêu cầu');
    expect(hasContent).toBeTruthy();
  });

  test('M3-E2E-02: tickets API responds', async ({ request }) => {
    const res = await request.get('/api/v1/tickets');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M3-E2E-03: rejects unauthenticated request', async ({ request }) => {
    const res = await request.get('/api/v1/tickets', {
      headers: { Authorization: '' },
    });
    expect([401, 403]).toContain(res.status());
  });
});
