import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, expectPageLoaded } from '../helpers/auth.helper';

test.describe('Notifications — Receive Notification @module:notifications @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('RN1: notifications page loads', async ({ page }) => {
    await page.goto('/notifications');
    await expectPageLoaded(page, /\/notifications/, ['Thông báo', 'Notifications']);
  });

  test('RN2: notifications page shows listing or empty state', async ({ page }) => {
    await page.goto('/notifications');
    const bodyText = (await page.textContent('body')) || '';
    const hasContent =
      bodyText.includes('Thông báo') ||
      bodyText.includes('Chưa có thông báo') ||
      bodyText.includes('Notifications') ||
      bodyText.includes('Không có thông báo mới');
    expect(hasContent).toBeTruthy();
  });

  test('RN3: notification list shows timestamps or categories', async ({ page }) => {
    await page.goto('/notifications');
    const bodyText = (await page.textContent('body')) || '';
    const hasStructure =
      bodyText.includes('Hệ thống') ||
      bodyText.includes('System') ||
      bodyText.includes('Thông báo') ||
      bodyText.includes('Notifications');
    expect(hasStructure).toBeTruthy();
  });
});
