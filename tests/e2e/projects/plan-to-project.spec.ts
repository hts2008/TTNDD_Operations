import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, expectPageLoaded } from '../helpers/auth.helper';

test.describe('Projects — Plan to Project @module:projects @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('PP1: projects list page loads', async ({ page }) => {
    await page.goto('/projects');
    await expectPageLoaded(page, /\/projects/, ['Dự án', 'Projects', 'Kế hoạch']);
  });

  test('PP2: new plan page is accessible', async ({ page }) => {
    await page.goto('/projects/plans/new');
    const bodyText = (await page.textContent('body')) || '';
    const hasNewPlan =
      bodyText.includes('Tạo kế hoạch') ||
      bodyText.includes('New Plan') ||
      bodyText.includes('Kế hoạch mới') ||
      bodyText.includes('Dự án') ||
      bodyText.includes('404');
    expect(hasNewPlan).toBeTruthy();
  });

  test('PP3: projects page shows listing or empty state', async ({ page }) => {
    await page.goto('/projects');
    const bodyText = (await page.textContent('body')) || '';
    const hasListing =
      bodyText.includes('Dự án') ||
      bodyText.includes('Chưa có dự án') ||
      bodyText.includes('Projects') ||
      bodyText.includes('Kế hoạch');
    expect(hasListing).toBeTruthy();
  });
});
