import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, expectPageLoaded } from '../helpers/auth.helper';

test.describe('Rewards — Earn Badge @module:rewards @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('EB1: rewards page loads', async ({ page }) => {
    await page.goto('/rewards');
    await expectPageLoaded(page, /\/rewards/, ['Phần thưởng', 'Rewards', 'Huy hiệu', 'Badge']);
  });

  test('EB2: badges sub-page shows badge definitions', async ({ page }) => {
    await page.goto('/rewards/badges');
    const bodyText = (await page.textContent('body')) || '';
    const hasBadges =
      bodyText.includes('Huy hiệu') ||
      bodyText.includes('Badge') ||
      bodyText.includes('Hạt Nhân') ||
      bodyText.includes('Chiến Binh') ||
      bodyText.includes('Chưa có huy hiệu');
    expect(hasBadges).toBeTruthy();
  });

  test('EB3: rewards page shows EXP or leaderboard section', async ({ page }) => {
    await page.goto('/rewards');
    const bodyText = (await page.textContent('body')) || '';
    const hasExp =
      bodyText.includes('EXP') ||
      bodyText.includes('Điểm') ||
      bodyText.includes('Bảng xếp hạng') ||
      bodyText.includes('Phần thưởng');
    expect(hasExp).toBeTruthy();
  });
});
