import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Rewards & Gamification — Badge Flow @module:rewards @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M9-E2E-01: rewards page loads', async ({ page }) => {
    await page.goto('/rewards');
    await expect(page).toHaveURL(/\/rewards/);
    const body = await page.textContent('body') || '';
    const hasContent =
      body.includes('Phần thưởng') ||
      body.includes('Rewards') ||
      body.includes('EXP') ||
      body.includes('Badge');
    expect(hasContent).toBeTruthy();
  });

  test('M9-E2E-02: badges page loads', async ({ page }) => {
    await page.goto('/rewards/badges');
    await expect(page).toHaveURL(/\/rewards\/badges/);
  });

  test('M9-E2E-03: rewards API responds', async ({ request }) => {
    const res = await request.get('/api/v1/rewards');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M9-E2E-04: rejects unauthenticated request', async ({ request }) => {
    const res = await request.get('/api/v1/rewards', {
      headers: { Authorization: '' },
    });
    expect([401, 403]).toContain(res.status());
  });
});
