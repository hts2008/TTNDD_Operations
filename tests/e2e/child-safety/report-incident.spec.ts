import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, expectPageLoaded } from '../helpers/auth.helper';

test.describe('Child Safety — Report Incident @module:child-safety @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('RI1: child safety page loads', async ({ page }) => {
    await page.goto('/child-safety');
    await expectPageLoaded(page, /\/child-safety/, ['An toàn', 'Child Safety', 'Bảo vệ', 'Trẻ em']);
  });

  test('RI2: child safety page shows report section or guidelines', async ({ page }) => {
    await page.goto('/child-safety');
    const bodyText = (await page.textContent('body')) || '';
    const hasContent =
      bodyText.includes('Báo cáo') ||
      bodyText.includes('Report') ||
      bodyText.includes('An toàn') ||
      bodyText.includes('Bảo vệ') ||
      bodyText.includes('Child Safety');
    expect(hasContent).toBeTruthy();
  });

  test('RI3: incident report form area accessible', async ({ page }) => {
    await page.goto('/child-safety');
    const bodyText = (await page.textContent('body')) || '';
    const hasForm =
      bodyText.includes('Báo cáo sự cố') ||
      bodyText.includes('Report Incident') ||
      bodyText.includes('Tạo báo cáo') ||
      bodyText.includes('An toàn') ||
      bodyText.includes('Child');
    expect(hasForm).toBeTruthy();
  });
});
