import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Settings — Org Configuration @module:settings @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('J8a: settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
    const bodyText = await page.textContent('body') || '';
    const hasContent = bodyText.includes('Cài đặt') || bodyText.includes('Settings') || bodyText.includes('Cấu hình');
    expect(hasContent).toBeTruthy();
  });

  test('J8b: settings page shows org-level config options', async ({ page }) => {
    await page.goto('/settings');
    const bodyText = await page.textContent('body') || '';
    const hasConfig = bodyText.includes('Tổ chức') || bodyText.includes('Ngành') || bodyText.includes('Phân quyền') || bodyText.includes('Organization');
    expect(hasConfig).toBeTruthy();
  });
});
