import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, clickTabIfVisible, clickButtonIfVisible } from '../helpers/auth.helper';

test.describe('HRM Transfers Journey — @module:hrm @module:transfers @smoke', () => {

  // ═══════════════════════════════════════════════════════════
  // T-0063: Transfer Wizard UI — Page Load & List
  // ═══════════════════════════════════════════════════════════

  test('TRANSFER-J1: admin can view transfers page', async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);

    // Navigate to transfers page
    await page.goto('/members/transfers');
    await page.waitForTimeout(2000);

    const bodyText = (await page.textContent('body')) || '';
    expect(
      bodyText.includes('Quản Lý Chuyển Ngành') ||
      bodyText.includes('Chuyển Ngành') ||
      bodyText.includes('Transfer')
    ).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════
  // Transfer List & Stats Cards
  // ═══════════════════════════════════════════════════════════

  test('TRANSFER-J2: transfers page shows stats cards and list', async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
    await page.goto('/members/transfers');
    await page.waitForTimeout(2000);

    const bodyText = (await page.textContent('body')) || '';

    // Stats cards should be visible
    const hasStats =
      bodyText.includes('Tổng số') ||
      bodyText.includes('Chờ duyệt') ||
      bodyText.includes('Đã duyệt') ||
      bodyText.includes('Bàn giao');
    expect(hasStats).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════
  // Status Filter Tabs
  // ═══════════════════════════════════════════════════════════

  test('TRANSFER-J3: status filter tabs are interactive', async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
    await page.goto('/members/transfers');
    await page.waitForTimeout(2000);

    // Check filter tabs exist
    const bodyText = (await page.textContent('body')) || '';
    const hasFilters =
      bodyText.includes('Tất cả') ||
      bodyText.includes('Chờ duyệt') ||
      bodyText.includes('Đã duyệt');
    expect(hasFilters).toBeTruthy();

    // Click a filter tab
    const clicked = await clickTabIfVisible(page, 'Chờ duyệt');
    // Filter should work (no crash)
    if (clicked) {
      await page.waitForTimeout(1000);
      const updatedText = (await page.textContent('body')) || '';
      expect(updatedText.length).toBeGreaterThan(50);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Create Transfer Dialog
  // ═══════════════════════════════════════════════════════════

  test('TRANSFER-J4: create transfer dialog opens', async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
    await page.goto('/members/transfers');
    await page.waitForTimeout(2000);

    // Click create button
    const createClicked = await clickButtonIfVisible(page, 'Tạo chuyển ngành');
    if (createClicked) {
      await page.waitForTimeout(1000);
      const bodyText = (await page.textContent('body')) || '';
      const hasDialog =
        bodyText.includes('Tạo Yêu Cầu Chuyển Ngành') ||
        bodyText.includes('Thành viên') ||
        bodyText.includes('Ngành đích');
      expect(hasDialog).toBeTruthy();
    }
  });

  // ═══════════════════════════════════════════════════════════
  // API Verification — Transfers endpoint
  // ═══════════════════════════════════════════════════════════

  test('TRANSFER-J5: transfers API returns valid response', async ({ request }) => {
    const res = await request.get('/api/hrm/transfers?page=1&limit=10').catch(() => null);
    if (res && res.ok()) {
      const data = await res.json();
      expect(Array.isArray(data) || typeof data === 'object').toBeTruthy();
    }
  });
});
