import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Child Safety — Report Incident Flow @module:child-safety @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M17-E2E-01: child-safety page loads', async ({ page }) => {
    await page.goto('/child-safety');
    await expect(page).toHaveURL(/\/child-safety/);
    const body = await page.textContent('body') || '';
    const hasContent =
      body.includes('An toàn') ||
      body.includes('Child Safety') ||
      body.includes('Báo cáo') ||
      body.includes('Incident');
    expect(hasContent).toBeTruthy();
  });

  test('M17-E2E-02: consent templates page loads', async ({ page }) => {
    await page.goto('/consent-templates');
    await expect(page).toHaveURL(/\/consent-templates/);
  });

  test('M17-E2E-03: rejects unauthenticated request', async ({ request }) => {
    const res = await request.get('/api/v1/child-safety', {
      headers: { Authorization: '' },
    });
    expect([401, 403, 404]).toContain(res.status());
  });
});
