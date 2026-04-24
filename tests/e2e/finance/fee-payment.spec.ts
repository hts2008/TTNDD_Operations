import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Finance — Fee Payment Flow @module:finance @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M4-E2E-01: finance page loads', async ({ page }) => {
    await page.goto('/finance');
    await expect(page).toHaveURL(/\/finance/);
    const body = await page.textContent('body') || '';
    const hasContent =
      body.includes('Tài chính') ||
      body.includes('Finance') ||
      body.includes('Ngân quỹ') ||
      body.includes('Thu phí');
    expect(hasContent).toBeTruthy();
  });

  test('M4-E2E-02: finance API responds', async ({ request }) => {
    const res = await request.get('/api/v1/finance');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M4-E2E-03: rejects unauthenticated request', async ({ request }) => {
    const res = await request.get('/api/v1/finance', {
      headers: { Authorization: '' },
    });
    expect([401, 403]).toContain(res.status());
  });
});
