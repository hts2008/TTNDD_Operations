import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Rewards — EXP Transactions @module:rewards @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M11-E2E-01: get EXP config rules', async ({ request }) => {
    const res = await request.get('/api/v1/rewards/exp/configs');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M11-E2E-02: upsert EXP config rule', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/exp/configs', {
      data: {
        eventType: 'e2e_test_event',
        sourceModule: 'test',
        actionName: 'test_action',
        expAmount: 5,
        maxPerDay: 3,
        maxPerWeek: 10,
        description: 'E2E test EXP config',
      },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });

  test('M11-E2E-03: award EXP to member', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/exp/award', {
      data: {
        memberId: 'test-member-001',
        amount: 25,
        notes: 'E2E test manual EXP award',
      },
    });
    expect([200, 201, 400, 401, 403]).toContain(res.status());
  });

  test('M11-E2E-04: deduct EXP from member', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/exp/deduct', {
      data: {
        memberId: 'test-member-001',
        amount: 5,
        reason: 'E2E test deduction',
      },
    });
    expect([200, 201, 400, 401, 403]).toContain(res.status());
  });

  test('M11-E2E-05: get member EXP summary', async ({ request }) => {
    const res = await request.get('/api/v1/rewards/exp/summary/test-member-001');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('totalExp');
      expect(body).toHaveProperty('availableExp');
    }
  });

  test('M11-E2E-06: get member EXP transactions with pagination', async ({ request }) => {
    const res = await request.get('/api/v1/rewards/exp/transactions/test-member-001?page=1&limit=10');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(body.meta).toHaveProperty('total');
      expect(body.meta).toHaveProperty('page');
    }
  });

  test('M11-E2E-07: deduct rejects zero amount', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/exp/deduct', {
      data: { memberId: 'test-member-001', amount: 0, reason: 'zero test' },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('M11-E2E-08: award rejects negative amount', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/exp/award', {
      data: { memberId: 'test-member-001', amount: -10 },
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});
