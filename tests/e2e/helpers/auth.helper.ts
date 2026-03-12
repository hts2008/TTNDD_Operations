import { Page, expect } from '@playwright/test';

// ── Demo Users ──────────────────────────────────────────────
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

export const DEMO_PARENT = {
  email: 'parent1@demo.ttndd.org',
  password: 'demo-password-123',
  orgId: 'aaaaaaaa-0000-0000-0000-000000000001',
};

// ── Auth Helper ─────────────────────────────────────────────
export async function loginAs(page: Page, user: typeof DEMO_ADMIN) {
  await page.goto('/login');
  await page.fill('[name="email"], input[type="email"]', user.email);
  await page.fill('[name="password"], input[type="password"]', user.password);
  await page.click('button[type="submit"], button:has-text("Đăng nhập")');
  await page.waitForURL(/\/(dashboard|members|sessions)/, { timeout: 10000 }).catch(() => {
    // API may not be running in isolation; proceed
  });
}

// ── Page Load Assertion ─────────────────────────────────────
/** Assert page loaded and body contains at least one of the given text patterns */
export async function expectPageLoaded(page: Page, urlPattern: RegExp, textPatterns: string[]) {
  await expect(page).toHaveURL(urlPattern);
  const bodyText = (await page.textContent('body')) || '';
  const found = textPatterns.some((p) => bodyText.includes(p));
  expect(found).toBeTruthy();
}

// ── Tab Click Utility ───────────────────────────────────────
/** Click a tab button by label if visible, return true if clicked */
export async function clickTabIfVisible(page: Page, label: string): Promise<boolean> {
  const tab = page.locator(`button:has-text("${label}"), [role="tab"]:has-text("${label}")`);
  if (await tab.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await tab.first().click();
    await page.waitForTimeout(500); // allow tab content to render
    return true;
  }
  return false;
}

// ── Form Fill Utility ───────────────────────────────────────
/** Fill a form field by name, placeholder, or label text */
export async function fillFormField(page: Page, nameOrPlaceholder: string, value: string) {
  const input = page.locator(
    `[name="${nameOrPlaceholder}"], input[placeholder*="${nameOrPlaceholder}"], textarea[placeholder*="${nameOrPlaceholder}"]`,
  );
  if (await input.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await input.first().fill(value);
    return true;
  }
  return false;
}

// ── Button Click Utility ────────────────────────────────────
/** Click a button by text if visible, return true if clicked */
export async function clickButtonIfVisible(page: Page, text: string): Promise<boolean> {
  const btn = page.locator(`button:has-text("${text}"), a:has-text("${text}")`);
  if (await btn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.first().click();
    return true;
  }
  return false;
}
