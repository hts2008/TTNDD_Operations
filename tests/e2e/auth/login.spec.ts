import { test, expect } from '@playwright/test';

test.describe('Auth — Login Flow @module:auth @gate', () => {
  test('J1a: shows login page with all required fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"], [name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], [name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Đăng nhập")')).toBeVisible();
  });

  test('J1b: login page has TTNDD branding', async ({ page }) => {
    await page.goto('/login');
    const pageText = await page.textContent('body') || '';
    const hasBranding = pageText.includes('TTNDD') || pageText.includes('Thiếu Nhi') || pageText.includes('Đạo Đức');
    expect(hasBranding).toBeTruthy();
  });
});
