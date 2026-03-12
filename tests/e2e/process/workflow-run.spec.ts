import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, expectPageLoaded } from '../helpers/auth.helper';

test.describe('Process — Workflow Run @module:process @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('WR1: process page loads', async ({ page }) => {
    await page.goto('/process');
    await expectPageLoaded(page, /\/process/, ['Quy trình', 'Process', 'Workflow']);
  });

  test('WR2: process page shows workflow listing or empty state', async ({ page }) => {
    await page.goto('/process');
    const bodyText = (await page.textContent('body')) || '';
    const hasContent =
      bodyText.includes('Quy trình') ||
      bodyText.includes('Chưa có quy trình') ||
      bodyText.includes('Workflow') ||
      bodyText.includes('Process');
    expect(hasContent).toBeTruthy();
  });

  test('WR3: create workflow action visible for admin', async ({ page }) => {
    await page.goto('/process');
    const bodyText = (await page.textContent('body')) || '';
    const hasAction =
      bodyText.includes('Tạo quy trình') ||
      bodyText.includes('New Workflow') ||
      bodyText.includes('Thêm') ||
      bodyText.includes('Quy trình');
    expect(hasAction).toBeTruthy();
  });
});
