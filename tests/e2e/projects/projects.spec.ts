import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Projects — Plans & Tasks @module:projects @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('J11a: projects page loads', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/projects/);
    const bodyText = await page.textContent('body') || '';
    const hasContent = bodyText.includes('Dự án') || bodyText.includes('Projects') || bodyText.includes('Kế hoạch');
    expect(hasContent).toBeTruthy();
  });

  test('J11b: projects page has listing or empty state', async ({ page }) => {
    await page.goto('/projects');
    const bodyText = await page.textContent('body') || '';
    const hasSection = bodyText.includes('Dự án') || bodyText.includes('Chưa có dự án') || bodyText.includes('Projects');
    expect(hasSection).toBeTruthy();
  });
});
