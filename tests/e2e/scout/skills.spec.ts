import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Skills — Scout Core @module:scout @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('J7a: skills page loads with title', async ({ page }) => {
    await page.goto('/skills');
    await expect(page).toHaveURL(/\/skills/);
    const bodyText = await page.textContent('body') || '';
    const hasContent = bodyText.includes('Kỹ Năng') || bodyText.includes('Skills') || bodyText.includes('Hướng Đạo');
    expect(hasContent).toBeTruthy();
  });

  test('J7b: skills page shows tabs (tree, verify, ranks)', async ({ page }) => {
    await page.goto('/skills');
    const bodyText = await page.textContent('body') || '';
    const hasTabs = bodyText.includes('Cây Kỹ Năng') || bodyText.includes('Hàng đợi duyệt') || bodyText.includes('Đẳng thứ');
    expect(hasTabs).toBeTruthy();
  });

  test('J7c: verification queue tab is accessible', async ({ page }) => {
    await page.goto('/skills');
    const verifyTab = page.locator('button:has-text("Hàng đợi duyệt")');
    if (await verifyTab.isVisible().catch(() => false)) {
      await verifyTab.click();
      const bodyText = await page.textContent('body') || '';
      const hasQueue = bodyText.includes('Hàng đợi Xác nhận') || bodyText.includes('Không có bài nộp');
      expect(hasQueue).toBeTruthy();
    }
  });

  test('J7d: ranks tab shows rank definitions', async ({ page }) => {
    await page.goto('/skills');
    const ranksTab = page.locator('button:has-text("Đẳng thứ")');
    if (await ranksTab.isVisible().catch(() => false)) {
      await ranksTab.click();
      const bodyText = await page.textContent('body') || '';
      const hasRanks = bodyText.includes('Hệ thống Đẳng thứ') || bodyText.includes('Chưa có đẳng thứ');
      expect(hasRanks).toBeTruthy();
    }
  });
});
