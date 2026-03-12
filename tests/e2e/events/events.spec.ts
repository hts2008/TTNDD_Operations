import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Events — Planning & Lifecycle @module:events @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('J10a: events page loads', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveURL(/\/events/);
    const bodyText = await page.textContent('body') || '';
    const hasContent = bodyText.includes('Sự kiện') || bodyText.includes('Events') || bodyText.includes('Trại') || bodyText.includes('Hoạt động');
    expect(hasContent).toBeTruthy();
  });

  test('J10b: events page shows list or empty state', async ({ page }) => {
    await page.goto('/events');
    const bodyText = await page.textContent('body') || '';
    const hasEventSection = bodyText.includes('Sự kiện') || bodyText.includes('Chưa có sự kiện') || bodyText.includes('Events');
    expect(hasEventSection).toBeTruthy();
  });
});
