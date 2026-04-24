import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Notifications — Receive & Read @module:notifications @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M14-E2E-01: notifications page loads', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page).toHaveURL(/\/notifications/);
    const body = await page.textContent('body') || '';
    const hasContent =
      body.includes('Thông báo') ||
      body.includes('Notifications') ||
      body.includes('Chưa đọc');
    expect(hasContent).toBeTruthy();
  });

  test('M14-E2E-02: notifications API responds', async ({ request }) => {
    const res = await request.get('/api/v1/notifications');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M14-E2E-03: rejects unauthenticated request', async ({ request }) => {
    const res = await request.get('/api/v1/notifications', {
      headers: { Authorization: '' },
    });
    expect([401, 403]).toContain(res.status());
  });
});
