import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Finance — Budget & Fees @module:finance @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('J9a: finance page loads', async ({ page }) => {
    await page.goto('/finance');
    await expect(page).toHaveURL(/\/finance/);
    const bodyText = await page.textContent('body') || '';
    const hasContent = bodyText.includes('Tài chính') || bodyText.includes('Finance') || bodyText.includes('Ngân sách') || bodyText.includes('Thu chi');
    expect(hasContent).toBeTruthy();
  });

  test('J9b: finance page has budgets or fees section', async ({ page }) => {
    await page.goto('/finance');
    const bodyText = await page.textContent('body') || '';
    const hasSection = bodyText.includes('Ngân sách') || bodyText.includes('Học phí') || bodyText.includes('Budget') || bodyText.includes('Fees') || bodyText.includes('Tài chính');
    expect(hasSection).toBeTruthy();
  });
});
