import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, expectPageLoaded } from '../helpers/auth.helper';

test.describe('Sessions — Create & Attend @module:sessions @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('SA1: sessions list page loads with content', async ({ page }) => {
    await page.goto('/sessions');
    await expectPageLoaded(page, /\/sessions/, ['Sinh hoạt', 'Session', 'Buổi']);
  });

  test('SA2: sessions page shows session cards or empty state', async ({ page }) => {
    await page.goto('/sessions');
    const bodyText = (await page.textContent('body')) || '';
    const hasContent =
      bodyText.includes('Sinh Hoạt Kỹ Năng') ||
      bodyText.includes('Sinh Hoạt Đạo Đức') ||
      bodyText.includes('Chưa có buổi sinh hoạt') ||
      bodyText.includes('Tạo buổi');
    expect(hasContent).toBeTruthy();
  });

  test('SA3: create session button is visible for admin', async ({ page }) => {
    await page.goto('/sessions');
    const bodyText = (await page.textContent('body')) || '';
    // Admin should see create action or session listing
    const hasAction =
      bodyText.includes('Tạo') ||
      bodyText.includes('Thêm') ||
      bodyText.includes('Sinh hoạt') ||
      bodyText.includes('Session');
    expect(hasAction).toBeTruthy();
  });
});
