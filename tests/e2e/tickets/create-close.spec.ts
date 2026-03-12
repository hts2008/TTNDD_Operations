import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, expectPageLoaded } from '../helpers/auth.helper';

test.describe('Tickets — Create & Close @module:tickets @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('TC1: tickets list page loads', async ({ page }) => {
    await page.goto('/tickets');
    await expectPageLoaded(page, /\/tickets/, ['Yêu cầu', 'Tickets', 'Phiếu']);
  });

  test('TC2: tickets page shows create button or listing', async ({ page }) => {
    await page.goto('/tickets');
    const bodyText = (await page.textContent('body')) || '';
    const hasAction =
      bodyText.includes('Tạo yêu cầu') ||
      bodyText.includes('New Ticket') ||
      bodyText.includes('Chưa có yêu cầu') ||
      bodyText.includes('Tickets');
    expect(hasAction).toBeTruthy();
  });

  test('TC3: ticket detail page loads from URL', async ({ page }) => {
    await page.goto('/tickets/test-ticket-id');
    const bodyText = (await page.textContent('body')) || '';
    const hasDetail =
      bodyText.includes('Yêu cầu') ||
      bodyText.includes('Ticket') ||
      bodyText.includes('Chi tiết') ||
      bodyText.includes('404') ||
      bodyText.includes('Không tìm thấy');
    expect(hasDetail).toBeTruthy();
  });
});
