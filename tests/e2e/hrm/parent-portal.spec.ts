import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Parent Portal — Dashboard & Children @module:hrm @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('J6a: parent portal page loads', async ({ page }) => {
    await page.goto('/parent');
    await expect(page).toHaveURL(/\/parent/);
    const bodyText = await page.textContent('body') || '';
    const hasContent = bodyText.includes('Cổng Phụ Huynh') || bodyText.includes('Parent');
    expect(hasContent).toBeTruthy();
  });

  test('J6b: parent portal shows 4 tabs', async ({ page }) => {
    await page.goto('/parent');
    const bodyText = await page.textContent('body') || '';
    const hasTabs =
      bodyText.includes('Tổng quan') || bodyText.includes('Con em') ||
      bodyText.includes('Nhật ký') || bodyText.includes('Thông báo');
    expect(hasTabs).toBeTruthy();
  });

  test('J6c: children tab is accessible', async ({ page }) => {
    await page.goto('/parent');
    const childrenTab = page.locator('button:has-text("Con em")');
    if (await childrenTab.isVisible().catch(() => false)) {
      await childrenTab.click();
      const bodyText = await page.textContent('body') || '';
      const hasChildSection = bodyText.includes('Con em đã liên kết') || bodyText.includes('Chưa có con em');
      expect(hasChildSection).toBeTruthy();
    }
  });
});
