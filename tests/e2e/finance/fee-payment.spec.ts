import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Finance — Fee Payment Flow @module:finance @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  // ── Page Load Tests ──

  test('M4-E2E-01: finance page loads', async ({ page }) => {
    await page.goto('/finance');
    await expect(page).toHaveURL(/\/finance/);
    const body = (await page.textContent('body')) || '';
    const hasContent =
      body.includes('Tài chính') || body.includes('Finance') || body.includes('Thu phí');
    expect(hasContent).toBeTruthy();
  });

  // ── Account API Tests ──

  test('M4-E2E-02: accounts API responds', async ({ request }) => {
    const res = await request.get('/api/v1/finance/accounts');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M4-E2E-03: rejects unauthenticated request', async ({ request }) => {
    const res = await request.get('/api/v1/finance/accounts', { headers: { Authorization: '' } });
    expect([401, 403]).toContain(res.status());
  });

  // ── Cost Center Tests ──

  test('M4-E2E-04: cost centers API responds', async ({ request }) => {
    const res = await request.get('/api/v1/finance/cost-centers');
    expect([200, 401, 403]).toContain(res.status());
  });

  // ── Fee Tests ──

  test('M4-E2E-05: fees API responds', async ({ request }) => {
    const res = await request.get('/api/v1/finance/fees');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M4-E2E-06: fee waiver rejects nonexistent fee', async ({ request }) => {
    const res = await request.post('/api/v1/finance/fees/nonexistent/waive', {
      data: { reason: 'test waiver' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M4-E2E-07: fee payment rejects nonexistent fee', async ({ request }) => {
    const res = await request.post('/api/v1/finance/fees/nonexistent/pay', {
      data: { amount: 100000 },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  // ── Fee Plans / Sponsors ──

  test('M4-E2E-08: fee plans API responds', async ({ request }) => {
    const res = await request.get('/api/v1/finance/fee-plans');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M4-E2E-09: sponsors API responds', async ({ request }) => {
    const res = await request.get('/api/v1/finance/sponsors');
    expect([200, 401, 403]).toContain(res.status());
  });

  // ── Reports ──

  test('M4-E2E-10: finance summary API responds', async ({ request }) => {
    const res = await request.get('/api/v1/finance/summary');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M4-E2E-11: projections API responds', async ({ request }) => {
    const res = await request.get('/api/v1/finance/projections');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M4-E2E-12: reconciliation API responds', async ({ request }) => {
    const res = await request.get('/api/v1/finance/reconciliation');
    expect([200, 401, 403]).toContain(res.status());
  });
});
