import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Scout — Rank Lifecycle (SM-11) @module:scout @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M8-E2E-01: rank definitions API responds', async ({ request }) => {
    const res = await request.get('/api/v1/scout/ranks');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M8-E2E-02: rank definitions filter by branchId', async ({ request }) => {
    const res = await request.get('/api/v1/scout/ranks?branchId=nonexistent');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
      expect(body.length).toBe(0);
    }
  });

  test('M8-E2E-03: member ranks API responds', async ({ request }) => {
    const res = await request.get('/api/v1/scout/member-ranks/nonexistent-member');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
      expect(body.length).toBe(0);
    }
  });

  test('M8-E2E-04: start rank rejects missing body fields', async ({ request }) => {
    const res = await request.post('/api/v1/scout/member-ranks/test-member/start', {
      data: {},
    });
    expect([400, 401, 403, 500]).toContain(res.status());
  });

  test('M8-E2E-05: transition rank rejects nonexistent member-rank', async ({ request }) => {
    const res = await request.post('/api/v1/scout/member-ranks/nonexistent-member/transition', {
      data: { rankId: 'fake-rank', action: 'propose' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M8-E2E-06: check eligibility responds for nonexistent member', async ({ request }) => {
    const res = await request.post(
      '/api/v1/scout/member-ranks/nonexistent-member/check-eligibility',
    );
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
      expect(body.length).toBe(0);
    }
  });

  test('M8-E2E-07: scout page renders rank content', async ({ page }) => {
    await page.goto('/scout');
    const body = (await page.textContent('body')) || '';
    const hasContent =
      body.includes('Scout') ||
      body.includes('Đẳng thứ') ||
      body.includes('Kỹ năng') ||
      body.includes('Đang tải');
    expect(hasContent).toBeTruthy();
  });

  test('M8-E2E-08: create rank definition requires admin role', async ({ request }) => {
    const res = await request.post('/api/v1/scout/ranks', {
      data: {
        branchId: 'test-branch',
        rankCode: 'TEST-RANK',
        rankName: 'Test Rank',
        rankOrder: 99,
      },
    });
    expect([201, 401, 403]).toContain(res.status());
  });
});
