import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Sessions — Lifecycle @module:sessions @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('J3a: sessions page loads', async ({ page }) => {
    await page.goto('/sessions');
    await expect(page).toHaveURL(/\/sessions/);
    const bodyText = await page.textContent('body') || '';
    const hasContent = bodyText.includes('Sinh hoạt') || bodyText.includes('Session') || bodyText.includes('Buổi');
    expect(hasContent).toBeTruthy();
  });
});
