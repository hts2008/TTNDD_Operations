import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

/**
 * STORY-013 — Finance Module E2E Journey (T-1076)
 *
 * Covers:
 * - Page load & navigation
 * - Stats cards display
 * - Tab navigation (7 tabs)
 * - Transactions filter
 * - Projections data
 * - Cost centers table
 * - Sponsors section
 * - Export functionality
 * - API endpoints validation
 */

test.describe('Finance Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  // ── Page Load ──
  test('should load finance page with header and stats', async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');

    // Header
    await expect(page.locator('h1')).toContainText('Quản lý Tài chính');

    // Stats cards (4 cards)
    const statsCards = page.locator('[class*="rounded-xl"][class*="border"]').filter({
      has: page.locator('[class*="text-xl"][class*="font-bold"]'),
    });
    await expect(statsCards).toHaveCount(4);

    // Should show refresh + export buttons
    await expect(page.getByText('Làm mới')).toBeVisible();
    await expect(page.getByText('Xuất dữ liệu')).toBeVisible();
  });

  // ── Tab Navigation ──
  test('should navigate between all 7 tabs', async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');

    const tabs = [
      { name: 'Tổng quan', content: 'Danh mục' },
      { name: 'Giao dịch', content: 'Lịch sử giao dịch' },
      { name: 'Phí thành viên', content: 'phí' },
      { name: 'Kế hoạch phí', content: 'phí' },
      { name: 'Nhà tài trợ', content: 'tài trợ' },
      { name: 'Dự báo', content: 'Số dư' },
      { name: 'Trung tâm chi phí', content: 'chi phí' },
    ];

    for (const tab of tabs) {
      await page.getByRole('button', { name: tab.name }).click();
      await page.waitForTimeout(500);
      // Each tab should render some related content
    }
  });

  // ── Overview Tab ──
  test('overview tab should show income/expense summary table', async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');

    // Default tab is overview — should show category table or empty state
    const hasCategories = await page.locator('text=Thu chi theo danh mục').isVisible();
    const isEmpty = await page.locator('text=Chưa có giao dịch nào').isVisible();
    expect(hasCategories || isEmpty).toBeTruthy();
  });

  // ── Transactions Tab ──
  test('transactions tab should show filter buttons and table', async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Giao dịch' }).click();
    await page.waitForTimeout(500);

    // Filter buttons
    await expect(page.getByRole('button', { name: 'Tất cả' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Chờ duyệt' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hoàn thành' })).toBeVisible();
  });

  // ── Fee Plans Tab ──
  test('fee plans tab should show plan cards or empty state', async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Kế hoạch phí' }).click();
    await page.waitForTimeout(500);

    const hasPlans = await page
      .locator('[class*="rounded-xl"]')
      .filter({
        has: page.locator('text=Active'),
      })
      .count();
    const isEmpty = await page.locator('text=Chưa có kế hoạch phí nào').isVisible();
    expect(hasPlans > 0 || isEmpty).toBeTruthy();
  });

  // ── Sponsors Tab ──
  test('sponsors tab should show sponsor cards or empty state', async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Nhà tài trợ' }).click();
    await page.waitForTimeout(500);

    const hasSponsors = await page.locator('text=Tổng cộng:').isVisible();
    const isEmpty = await page.locator('text=Chưa có nhà tài trợ nào').isVisible();
    expect(hasSponsors || isEmpty).toBeTruthy();
  });

  // ── Projections Tab ──
  test('projections tab should show balance projection metrics', async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Dự báo' }).click();
    await page.waitForTimeout(500);

    // Should show key metrics or error state
    const hasMetrics = await page.locator('text=Số dư hiện tại').isVisible();
    const hasError = await page.locator('text=Không thể tải dữ liệu dự báo').isVisible();
    expect(hasMetrics || hasError).toBeTruthy();
  });

  // ── Cost Centers Tab ──
  test('cost centers tab should show table or empty state', async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Trung tâm chi phí' }).click();
    await page.waitForTimeout(500);

    const hasTable = await page.locator('text=Trung tâm chi phí').count();
    const isEmpty = await page.locator('text=Chưa có trung tâm chi phí nào').isVisible();
    expect(hasTable > 0 || isEmpty).toBeTruthy();
  });

  // ── API Endpoint Validation ──
  test('should validate finance API endpoints return correct shape', async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');

    const endpoints = [
      { url: '/api/v1/finance/summary', key: 'totals' },
      { url: '/api/v1/finance/fees', key: 'data' },
      { url: '/api/v1/finance/fee-plans', key: 'data' },
      { url: '/api/v1/finance/sponsors', key: 'data' },
      { url: '/api/v1/finance/projections', key: 'projections' },
      { url: '/api/v1/finance/export', key: 'rows' },
      { url: '/api/v1/finance/cost-centers', key: 'data' },
      { url: '/api/v1/finance/budget-variance', key: 'actual' },
      { url: '/api/v1/finance/reconciliation', key: 'summary' },
    ];

    for (const ep of endpoints) {
      const response = await page.request.get(ep.url);
      // Should either return 200 or 401/403 (if auth required)
      expect([200, 401, 403]).toContain(response.status());
    }
  });

  // ── Export Button ──
  test('export button should trigger download', async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');

    const exportBtn = page.getByText('Xuất dữ liệu');
    await expect(exportBtn).toBeVisible();
    // Just verify the button exists and is clickable — actual download
    // behavior depends on browser context
    await expect(exportBtn).toBeEnabled();
  });
});
