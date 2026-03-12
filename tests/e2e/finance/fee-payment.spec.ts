import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, expectPageLoaded, clickTabIfVisible } from '../helpers/auth.helper';

test.describe('Finance — Fee Payment @module:finance @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('FP1: finance page loads with content', async ({ page }) => {
    await page.goto('/finance');
    await expectPageLoaded(page, /\/finance/, ['Tài chính', 'Finance', 'Ngân sách', 'Thu chi']);
  });

  test('FP2: finance page has budget or fees section', async ({ page }) => {
    await page.goto('/finance');
    const bodyText = (await page.textContent('body')) || '';
    const hasSection =
      bodyText.includes('Ngân sách') ||
      bodyText.includes('Học phí') ||
      bodyText.includes('Budget') ||
      bodyText.includes('Fees') ||
      bodyText.includes('Tài chính');
    expect(hasSection).toBeTruthy();
  });

  test('FP3: fee tab accessible if present', async ({ page }) => {
    await page.goto('/finance');
    const clicked = await clickTabIfVisible(page, 'Học phí');
    if (clicked) {
      const bodyText = (await page.textContent('body')) || '';
      const hasFees =
        bodyText.includes('Học phí') ||
        bodyText.includes('Phí') ||
        bodyText.includes('Đóng phí');
      expect(hasFees).toBeTruthy();
    }
  });
});
