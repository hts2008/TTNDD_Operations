import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Scout Core — Skill & Rank Journey @module:scout @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('J4a: scout dashboard page loads', async ({ page }) => {
    await page.goto('/scout');
    await expect(page).toHaveURL(/\/scout/);
    const bodyText = (await page.textContent('body')) || '';
    const hasContent =
      bodyText.includes('Scout') || bodyText.includes('Đẳng thứ') || bodyText.includes('Kỹ năng');
    expect(hasContent).toBeTruthy();
  });

  test('J4b: skills page loads with rank progression', async ({ page }) => {
    await page.goto('/skills');
    await expect(page).toHaveURL(/\/skills/);
    const bodyText = (await page.textContent('body')) || '';
    const hasRank =
      bodyText.includes('Đẳng thứ') || bodyText.includes('Rank') || bodyText.includes('Tiến trình');
    expect(hasRank).toBeTruthy();
  });

  test('J4c: skills page shows skill groups', async ({ page }) => {
    await page.goto('/skills');
    const bodyText = (await page.textContent('body')) || '';
    const hasGroups = bodyText.includes('Kỹ năng') || bodyText.includes('Skill');
    expect(hasGroups).toBeTruthy();
  });
});
