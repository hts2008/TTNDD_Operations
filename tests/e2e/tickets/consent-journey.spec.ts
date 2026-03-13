import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, expectPageLoaded } from '../helpers/auth.helper';

test.describe('Tickets — Consent & Approval Journey @module:tickets @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('CJ1: consent templates page loads', async ({ page }) => {
    await page.goto('/consent-templates');
    await expectPageLoaded(page, /\/consent-templates/, ['Đồng ý', 'Consent', 'Mẫu', 'Phụ huynh']);
  });

  test('CJ2: consent templates page shows stats', async ({ page }) => {
    await page.goto('/consent-templates');
    const bodyText = (await page.textContent('body')) || '';
    const hasStats =
      bodyText.includes('Tổng mẫu') ||
      bodyText.includes('Đã ký') ||
      bodyText.includes('Chữ ký chờ') ||
      bodyText.includes('Consent');
    expect(hasStats).toBeTruthy();
  });

  test('CJ3: consent templates table shows data or empty state', async ({ page }) => {
    await page.goto('/consent-templates');
    await page.waitForTimeout(2000);
    const bodyText = (await page.textContent('body')) || '';
    const hasTable =
      bodyText.includes('Đồng ý tham gia') ||
      bodyText.includes('Danh sách mẫu') ||
      bodyText.includes('Chưa có mẫu');
    expect(hasTable).toBeTruthy();
  });

  test('CJ4: approval page loads and shows list', async ({ page }) => {
    await page.goto('/approvals');
    await expectPageLoaded(page, /\/approvals/, ['Phê duyệt', 'Approval', 'Duyệt']);
  });
});
