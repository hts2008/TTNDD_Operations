import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, expectPageLoaded, clickTabIfVisible } from '../helpers/auth.helper';

test.describe('Scout — Skill Progress @module:scout @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('SP1: skills page loads with skill tree', async ({ page }) => {
    await page.goto('/skills');
    await expectPageLoaded(page, /\/skills/, ['Kỹ Năng', 'Skills', 'Hướng Đạo']);
  });

  test('SP2: skill tree tab shows skill groups', async ({ page }) => {
    await page.goto('/skills');
    const bodyText = (await page.textContent('body')) || '';
    const hasGroups =
      bodyText.includes('Đạo Đức') ||
      bodyText.includes('Kỹ Năng Sống') ||
      bodyText.includes('Lãnh Đạo') ||
      bodyText.includes('Cây Kỹ Năng');
    expect(hasGroups).toBeTruthy();
  });

  test('SP3: verification queue tab accessible and shows content', async ({ page }) => {
    await page.goto('/skills');
    const clicked = await clickTabIfVisible(page, 'Hàng đợi duyệt');
    if (clicked) {
      const bodyText = (await page.textContent('body')) || '';
      const hasQueue =
        bodyText.includes('Hàng đợi Xác nhận') ||
        bodyText.includes('Không có bài nộp') ||
        bodyText.includes('xác nhận');
      expect(hasQueue).toBeTruthy();
    }
  });
});
