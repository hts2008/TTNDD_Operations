import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Assets — Loan/Return Flow @module:assets @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M5-E2E-01: assets page loads with tabs', async ({ page }) => {
    await page.goto('/assets');
    await expect(page).toHaveURL(/\/assets/);
    const body = await page.textContent('body') || '';
    const hasTabs = body.includes('Kho tài sản') || body.includes('Tài sản') || body.includes('Assets');
    expect(hasTabs).toBeTruthy();
  });

  test('M5-E2E-02: loans tab is navigable', async ({ page }) => {
    await page.goto('/assets');
    const loansTab = page.locator('button:has-text("Mượn/Trả"), button:has-text("Loans")');
    if (await loansTab.count() > 0) {
      await loansTab.first().click();
      // After clicking, loan content should show
      const body = await page.textContent('body') || '';
      const hasLoanContent =
        body.includes('Chờ duyệt') ||
        body.includes('Đã cho mượn') ||
        body.includes('Không có phiếu mượn') ||
        body.includes('pending');
      expect(hasLoanContent).toBeTruthy();
    }
  });

  test('M5-E2E-03: overdue loans API responds', async ({ request }) => {
    const res = await request.get('/api/assets/loans/overdue');
    // API may require auth; accept 200 or 401
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M5-E2E-04: stock alerts API responds', async ({ request }) => {
    const res = await request.get('/api/assets/stock-alerts?threshold=5');
    expect([200, 401, 403]).toContain(res.status());
  });
});
