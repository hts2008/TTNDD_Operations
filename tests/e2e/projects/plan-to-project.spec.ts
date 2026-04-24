import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Projects — Plan to Project Flow @module:projects @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M2-E2E-01: projects page loads', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/projects/);
    const body = await page.textContent('body') || '';
    const hasContent =
      body.includes('Dự án') ||
      body.includes('Projects') ||
      body.includes('Kế hoạch') ||
      body.includes('Plan');
    expect(hasContent).toBeTruthy();
  });

  test('M2-E2E-02: projects API responds', async ({ request }) => {
    const res = await request.get('/api/v1/projects');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M2-E2E-03: rejects unauthenticated request', async ({ request }) => {
    const res = await request.get('/api/v1/projects', {
      headers: { Authorization: '' },
    });
    expect([401, 403]).toContain(res.status());
  });
});
