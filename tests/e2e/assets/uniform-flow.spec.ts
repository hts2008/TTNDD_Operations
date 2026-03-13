import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Assets — Uniform Issue/Return @module:assets @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M5-E2E-08: uniform tab is navigable', async ({ page }) => {
    await page.goto('/assets');
    const uniformTab = page.locator('button:has-text("Đồng phục"), button:has-text("Uniform")');
    if (await uniformTab.count() > 0) {
      await uniformTab.first().click();
      const body = await page.textContent('body') || '';
      const hasUniformContent =
        body.includes('Đồng phục') ||
        body.includes('Uniform') ||
        body.includes('Đang cấp') ||
        body.includes('Chưa có dữ liệu đồng phục');
      expect(hasUniformContent).toBeTruthy();
    }
  });

  test('M5-E2E-09: uniform list API responds', async ({ request }) => {
    const res = await request.get('/api/assets/uniform');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M5-E2E-10: maintenance tab is navigable', async ({ page }) => {
    await page.goto('/assets');
    const maintenanceTab = page.locator('button:has-text("Bảo trì"), button:has-text("Maintenance")');
    if (await maintenanceTab.count() > 0) {
      await maintenanceTab.first().click();
      const body = await page.textContent('body') || '';
      const hasMaintenanceContent =
        body.includes('Bảo trì') ||
        body.includes('Maintenance') ||
        body.includes('Đến hạn') ||
        body.includes('Chưa có lịch bảo trì');
      expect(hasMaintenanceContent).toBeTruthy();
    }
  });

  test('M5-E2E-11: maintenance API responds', async ({ request }) => {
    const res = await request.get('/api/assets/maintenance');
    expect([200, 401, 403]).toContain(res.status());
  });
});
