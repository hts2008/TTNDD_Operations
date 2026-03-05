import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Dashboard — Org Overview @module:org @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('J1: org dashboard page exists', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('J1: dashboard shows navigation links', async ({ page }) => {
    await page.goto('/dashboard');
    const bodyText = await page.textContent('body') || '';
    const hasNav = bodyText.includes('Đoàn sinh') || bodyText.includes('Sinh hoạt') || bodyText.includes('Dashboard') || bodyText.includes('Tổng quan');
    expect(hasNav).toBeTruthy();
  });
});
