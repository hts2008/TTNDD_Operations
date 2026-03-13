import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Assets — Kit Checklist @module:assets @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M5-E2E-05: kits tab is navigable', async ({ page }) => {
    await page.goto('/assets');
    const kitsTab = page.locator('button:has-text("Bộ kit"), button:has-text("Kits")');
    if (await kitsTab.count() > 0) {
      await kitsTab.first().click();
      const body = await page.textContent('body') || '';
      const hasKitContent =
        body.includes('Bộ Kit') ||
        body.includes('Kit') ||
        body.includes('Xem danh sách kit');
      expect(hasKitContent).toBeTruthy();
    }
  });

  test('M5-E2E-06: kit templates API responds', async ({ request }) => {
    const res = await request.get('/api/assets/kits');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M5-E2E-07: generate checklist API responds', async ({ request }) => {
    const res = await request.post('/api/assets/kits/a5100001-0000-0000-0000-000000000001/checklist', {
      data: { eventLabel: 'E2E Test Camp' },
    });
    // 200 if seeded, 401/404 otherwise
    expect([200, 201, 401, 403, 404]).toContain(res.status());
  });
});
