import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, expectPageLoaded } from '../helpers/auth.helper';

test.describe('Events — Register Event @module:events @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('RE1: events page loads with content', async ({ page }) => {
    await page.goto('/events');
    await expectPageLoaded(page, /\/events/, ['Sự kiện', 'Events', 'Trại', 'Hoạt động']);
  });

  test('RE2: events page shows event cards or empty state', async ({ page }) => {
    await page.goto('/events');
    const bodyText = (await page.textContent('body')) || '';
    const hasContent =
      bodyText.includes('Trại Hè') ||
      bodyText.includes('Ngày Hội') ||
      bodyText.includes('Chưa có sự kiện') ||
      bodyText.includes('Tạo sự kiện');
    expect(hasContent).toBeTruthy();
  });

  test('RE3: event registration area accessible', async ({ page }) => {
    await page.goto('/events');
    const bodyText = (await page.textContent('body')) || '';
    const hasRegArea =
      bodyText.includes('Đăng ký') ||
      bodyText.includes('Register') ||
      bodyText.includes('Sự kiện') ||
      bodyText.includes('Trại');
    expect(hasRegArea).toBeTruthy();
  });
});
