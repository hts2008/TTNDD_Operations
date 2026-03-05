import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('HRM — Member Roster @module:hrm @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('J2a: member list page loads', async ({ page }) => {
    await page.goto('/members');
    await expect(page).toHaveURL(/\/members/);
    const bodyText = await page.textContent('body') || '';
    const hasContent = bodyText.includes('Đoàn sinh') || bodyText.includes('Member') || bodyText.includes('Thành viên');
    expect(hasContent).toBeTruthy();
  });

  test('J2b: member detail page loads from URL', async ({ page }) => {
    await page.goto('/members/eeeeeee1-0000-0000-0000-000000000003');
    await expect(page).toHaveURL(/\/members\//);
  });
});
