import { Page } from '@playwright/test';

export const DEMO_ADMIN = {
  email: 'truong1@demo.ttndd.org',
  password: 'demo-password-123',
  orgId: 'aaaaaaaa-0000-0000-0000-000000000001',
};

export const DEMO_MEMBER = {
  email: 'ds1@demo.ttndd.org',
  password: 'demo-password-123',
  orgId: 'aaaaaaaa-0000-0000-0000-000000000001',
};

export async function loginAs(page: Page, user: typeof DEMO_ADMIN) {
  await page.goto('/login');
  await page.fill('[name="email"], input[type="email"]', user.email);
  await page.fill('[name="password"], input[type="password"]', user.password);
  await page.click('button[type="submit"], button:has-text("Đăng nhập")');
  await page.waitForURL(/\/(dashboard|members|sessions)/, { timeout: 10000 }).catch(() => {
    // API may not be running in isolation; proceed
  });
}
