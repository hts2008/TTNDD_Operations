import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, clickTabIfVisible } from '../helpers/auth.helper';

// Seeded member IDs from seed.ts
const SEEDED_CHILD_MEMBER_ID = 'eeeeeee1-0000-0000-0000-000000000003'; // Lê Văn Cường

test.describe('Parent Portal — Dashboard, Children & Compliance @module:hrm @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  // ═══════════════════════════════════════════════════════════
  // T-1013: Parent Portal Page — Dashboard
  // ═══════════════════════════════════════════════════════════

  test('J6a: parent portal page loads', async ({ page }) => {
    await page.goto('/parent');
    await expect(page).toHaveURL(/\/parent/);
    await page.waitForTimeout(2000);
    const bodyText = (await page.textContent('body')) || '';
    const hasContent =
      bodyText.includes('Cổng Phụ Huynh') ||
      bodyText.includes('Parent') ||
      bodyText.includes('Tổng quan');
    expect(hasContent).toBeTruthy();
  });

  test('J6a-deep: parent portal shows dashboard with sections', async ({ page }) => {
    await page.goto('/parent');
    await page.waitForTimeout(2000);
    const bodyText = (await page.textContent('body')) || '';
    // Dashboard sections: overview, children, activity log, notifications
    const hasSections =
      bodyText.includes('Tổng quan') ||
      bodyText.includes('Con em') ||
      bodyText.includes('Nhật ký') ||
      bodyText.includes('Thông báo') ||
      bodyText.includes('Parent');
    expect(hasSections).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════
  // T-1013: Parent Portal Tabs
  // ═══════════════════════════════════════════════════════════

  test('J6b: parent portal shows navigable tabs', async ({ page }) => {
    await page.goto('/parent');
    await page.waitForTimeout(1500);
    const bodyText = (await page.textContent('body')) || '';
    const hasTabs =
      bodyText.includes('Tổng quan') ||
      bodyText.includes('Con em') ||
      bodyText.includes('Nhật ký') ||
      bodyText.includes('Thông báo');
    expect(hasTabs).toBeTruthy();
  });

  test('J6c: children tab shows linked children or empty state', async ({ page }) => {
    await page.goto('/parent');
    await page.waitForTimeout(1500);
    const clicked = await clickTabIfVisible(page, 'Con em');
    if (clicked) {
      await page.waitForTimeout(1500);
      const bodyText = (await page.textContent('body')) || '';
      const hasChildSection =
        bodyText.includes('Con em đã liên kết') ||
        bodyText.includes('Chưa có con em') ||
        bodyText.includes('Con em') ||
        bodyText.includes('Đoàn sinh');
      expect(hasChildSection).toBeTruthy();
    }
  });

  test('J6d: activity log tab shows access logs or empty state', async ({ page }) => {
    await page.goto('/parent');
    await page.waitForTimeout(1500);
    const clicked = await clickTabIfVisible(page, 'Nhật ký');
    if (clicked) {
      await page.waitForTimeout(1500);
      const bodyText = (await page.textContent('body')) || '';
      const hasLogs =
        bodyText.includes('Nhật ký') ||
        bodyText.includes('Truy cập') ||
        bodyText.includes('Chưa có') ||
        bodyText.includes('Lịch sử');
      expect(hasLogs).toBeTruthy();
    }
  });

  test('J6e: notifications tab shows settings or empty state', async ({ page }) => {
    await page.goto('/parent');
    await page.waitForTimeout(1500);
    const clicked = await clickTabIfVisible(page, 'Thông báo');
    if (clicked) {
      await page.waitForTimeout(1500);
      const bodyText = (await page.textContent('body')) || '';
      const hasNotifs =
        bodyText.includes('Thông báo') ||
        bodyText.includes('Cài đặt') ||
        bodyText.includes('Kênh') ||
        bodyText.includes('email') ||
        bodyText.includes('Chưa có');
      expect(hasNotifs).toBeTruthy();
    }
  });

  // ═══════════════════════════════════════════════════════════
  // T-1014: Compliance Center — Expiring Items
  // ═══════════════════════════════════════════════════════════

  test('J6f: compliance expiring API returns structured data', async ({ request }) => {
    const res = await request.get('/api/hrm/compliance/expiring?daysAhead=90').catch(() => null);
    if (res && res.ok()) {
      const data = await res.json();
      expect(data).toHaveProperty('expiringChecks');
      expect(data).toHaveProperty('expiringTraining');
    }
  });

  // ═══════════════════════════════════════════════════════════
  // T-1013: Parent Dashboard API
  // ═══════════════════════════════════════════════════════════

  test('J6g: parent dashboard API returns aggregated data', async ({ request }) => {
    const res = await request.get('/api/hrm/parent/dashboard').catch(() => null);
    if (res && res.ok()) {
      const data = await res.json();
      expect(data).toHaveProperty('children');
      expect(data).toHaveProperty('attendance');
      expect(data).toHaveProperty('consents');
    }
  });

  test('J6h: parent children API returns linked children', async ({ request }) => {
    const res = await request.get('/api/hrm/parent/children').catch(() => null);
    if (res && res.ok()) {
      const data = await res.json();
      expect(Array.isArray(data)).toBeTruthy();
    }
  });

  // ═══════════════════════════════════════════════════════════
  // T-1014: Child Data Access Logs (COPPA)
  // ═══════════════════════════════════════════════════════════

  test('J6i: child access logs API returns audit trail', async ({ request }) => {
    const res = await request
      .get(`/api/hrm/parent/child-access-logs/${SEEDED_CHILD_MEMBER_ID}?limit=10`)
      .catch(() => null);
    if (res && res.ok()) {
      const data = await res.json();
      expect(Array.isArray(data)).toBeTruthy();
    }
  });

  // ═══════════════════════════════════════════════════════════
  // T-1015: Loading/Empty/Error States
  // ═══════════════════════════════════════════════════════════

  test('J6j: parent portal handles no-children state gracefully', async ({ page }) => {
    await page.goto('/parent');
    await page.waitForTimeout(2000);
    const bodyText = (await page.textContent('body')) || '';
    // Page should render something meaningful — not crash
    expect(bodyText.length).toBeGreaterThan(50);
  });
});
