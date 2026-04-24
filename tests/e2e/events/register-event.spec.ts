import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Events & Camps — Registration Flow @module:events @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M12-E2E-01: events page loads', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveURL(/\/events/);
    const body = await page.textContent('body') || '';
    const hasContent =
      body.includes('Sự kiện') ||
      body.includes('Trại') ||
      body.includes('Events') ||
      body.includes('Camp');
    expect(hasContent).toBeTruthy();
  });

  test('M12-E2E-02: events API responds', async ({ request }) => {
    const res = await request.get('/api/v1/events');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M12-E2E-03: rejects unauthenticated request', async ({ request }) => {
    const res = await request.get('/api/v1/events', {
      headers: { Authorization: '' },
    });
    expect([401, 403]).toContain(res.status());
  });
});
