import { test, expect } from '@playwright/test';

/**
 * STORY-012 M3-A — Ticket & Approval E2E Tests
 * Covers: T-1041..T-1050
 */

test.describe('Module 3: Tickets', () => {
  test('J9a: Ticket list page loads with table and filters', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.locator('h1')).toContainText('Yêu cầu hỗ trợ');
    // Stats row should show
    await expect(page.locator('text=Tổng')).toBeVisible();
    // Filter selects should exist
    await expect(page.locator('select').first()).toBeVisible();
    // Create button
    await expect(page.locator('text=Tạo yêu cầu')).toBeVisible();
  });

  test('J9b: Ticket list shows ticket numbers and clickable links', async ({ page }) => {
    await page.goto('/tickets');
    // Should have at least one ticket row with TK-XXXXX format
    const ticketLinks = page.locator('a[href^="/tickets/"]');
    const count = await ticketLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('J9c: Create ticket dialog opens and closes', async ({ page }) => {
    await page.goto('/tickets');
    // Open create dialog
    await page.click('text=Tạo yêu cầu');
    await expect(page.locator('text=Tạo yêu cầu mới')).toBeVisible();
    // Fields should be present
    await expect(page.locator('input[placeholder*="Mô tả ngắn"]')).toBeVisible();
    // Close dialog
    await page.click('text=Hủy');
    await expect(page.locator('text=Tạo yêu cầu mới')).not.toBeVisible();
  });

  test('J9d: SLA tab is accessible', async ({ page }) => {
    await page.goto('/tickets');
    // Click SLA tab
    await page.click('text=SLA');
    // Should show SLA content (either breaches or "all good" message)
    const content = page.locator('.space-y-4');
    await expect(content).toBeVisible();
  });

  test('J9e: Ticket detail page loads with info and actions', async ({ page }) => {
    await page.goto('/tickets/1');
    // Should show ticket number
    await expect(page.locator('text=TK-')).toBeVisible();
    // Should have actions card
    await expect(page.locator('text=Hành động')).toBeVisible();
    // Should have info card
    await expect(page.locator('text=Thông tin')).toBeVisible();
    // Should have comment input
    await expect(page.locator('input[placeholder*="Viết bình luận"]')).toBeVisible();
  });

  test('J9f: Ticket detail tabs (comments, attachments, history) work', async ({ page }) => {
    await page.goto('/tickets/1');
    // Default tab = comments
    await expect(page.locator('text=Bình luận')).toBeVisible();
    // Switch to attachments
    await page.click('text=Tệp đính kèm');
    await expect(page.locator('text=đính kèm')).toBeVisible();
    // Switch to history
    await page.click('text=Lịch sử');
    await expect(page.locator('text=Lịch sử')).toBeVisible();
  });
});

test.describe('Module 3: Approvals', () => {
  test('J10a: Approvals page loads with stats and filters', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.locator('h1')).toContainText('Phê duyệt');
    // Stats row
    await expect(page.locator('text=Tổng yêu cầu')).toBeVisible();
    await expect(page.locator('text=Chờ xử lý')).toBeVisible();
    await expect(page.locator('text=Đã duyệt')).toBeVisible();
  });

  test('J10b: Approval requests show step progress', async ({ page }) => {
    await page.goto('/approvals');
    // Should show at least one approval card with step progress
    await expect(page.locator('text=Tiến trình phê duyệt')).toBeVisible();
  });

  test('J10c: Filter tabs work', async ({ page }) => {
    await page.goto('/approvals');
    // Click "Đã duyệt" filter
    await page.click('button:has-text("Đã duyệt")');
    // Wait for filter to apply
    await page.waitForTimeout(200);
    // Click "Tất cả"
    await page.click('button:has-text("Tất cả")');
    await page.waitForTimeout(200);
    // Should still show content
    await expect(page.locator('text=Tiến trình phê duyệt').first()).toBeVisible();
  });

  test('J10d: Approval action panel shows for in_progress items', async ({ page }) => {
    await page.goto('/approvals');
    // Look for approve/reject buttons in pending items
    const approveBtn = page.locator('button:has-text("Phê duyệt")');
    const rejectBtn = page.locator('button:has-text("Từ chối")');
    // At least one should exist if there are pending items
    const btnCount = await approveBtn.count();
    if (btnCount > 0) {
      await expect(approveBtn.first()).toBeVisible();
      await expect(rejectBtn.first()).toBeVisible();
    }
  });
});
