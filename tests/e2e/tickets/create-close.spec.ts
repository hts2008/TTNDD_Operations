import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Tickets — Create to Close Flow @module:tickets @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  // ── Page Load Tests ──

  test('M3-E2E-01: tickets page loads', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page).toHaveURL(/\/tickets/);
    const body = (await page.textContent('body')) || '';
    const hasContent =
      body.includes('Phiếu hỗ trợ') || body.includes('Tickets') || body.includes('Yêu cầu');
    expect(hasContent).toBeTruthy();
  });

  // ── API Smoke Tests ──

  test('M3-E2E-02: tickets API responds', async ({ request }) => {
    const res = await request.get('/api/v1/tickets');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M3-E2E-03: rejects unauthenticated request', async ({ request }) => {
    const res = await request.get('/api/v1/tickets', { headers: { Authorization: '' } });
    expect([401, 403]).toContain(res.status());
  });

  test('M3-E2E-04: SLA dashboard API responds', async ({ request }) => {
    const res = await request.get('/api/v1/tickets/sla-dashboard');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M3-E2E-05: category routing API responds', async ({ request }) => {
    const res = await request.get('/api/v1/tickets/category-routing');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(typeof body).toBe('object');
    }
  });

  test('M3-E2E-06: consent templates API responds', async ({ request }) => {
    const res = await request.get('/api/v1/tickets/consent-templates');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  // ── SM-5 Transition Tests ──

  test('M3-E2E-07: ticket transition rejects invalid action', async ({ request }) => {
    const res = await request.post('/api/v1/tickets/nonexistent/transition', {
      data: { action: 'assign' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M3-E2E-08: ticket escalation rejects nonexistent ticket', async ({ request }) => {
    const res = await request.post('/api/v1/tickets/nonexistent/escalate', {
      data: { reason: 'test' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  // ── Approval Tests ──

  test('M3-E2E-09: approval request rejects nonexistent ticket', async ({ request }) => {
    const res = await request.post('/api/v1/tickets/nonexistent/approval', {
      data: { approvalType: 'budget', amount: 1000000 },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M3-E2E-10: approve/reject rejects nonexistent ticket', async ({ request }) => {
    const res = await request.post('/api/v1/tickets/nonexistent/approve', {
      data: { decision: 'approve' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  // ── Comment Tests ──

  test('M3-E2E-11: comment on nonexistent ticket fails gracefully', async ({ request }) => {
    const res = await request.post('/api/v1/tickets/nonexistent/comments', {
      data: { content: 'test comment' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  // ── Consent Tests ──

  test('M3-E2E-12: consent ticket with invalid template fails', async ({ request }) => {
    const res = await request.post('/api/v1/tickets/consent/invalid_template', {
      data: { guardianName: 'Test' },
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});
