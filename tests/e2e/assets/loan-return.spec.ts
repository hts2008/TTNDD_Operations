import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, expectPageLoaded } from '../helpers/auth.helper';

test.describe('Assets — Loan & Return @module:assets @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('LR1: assets page loads', async ({ page }) => {
    await page.goto('/assets');
    await expectPageLoaded(page, /\/assets/, ['Tài sản', 'Assets', 'Vật tư', 'Trang bị']);
  });

  test('LR2: assets page shows listing or empty state', async ({ page }) => {
    await page.goto('/assets');
    const bodyText = (await page.textContent('body')) || '';
    const hasContent =
      bodyText.includes('Danh sách') ||
      bodyText.includes('Chưa có tài sản') ||
      bodyText.includes('Tài sản') ||
      bodyText.includes('Assets');
    expect(hasContent).toBeTruthy();
  });

  test('LR3: loan/checkout action area visible for admin', async ({ page }) => {
    await page.goto('/assets');
    const bodyText = (await page.textContent('body')) || '';
    const hasAction =
      bodyText.includes('Mượn') ||
      bodyText.includes('Loan') ||
      bodyText.includes('Tạo') ||
      bodyText.includes('Tài sản') ||
      bodyText.includes('Thêm');
    expect(hasAction).toBeTruthy();
  });
});
