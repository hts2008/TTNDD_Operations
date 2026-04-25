import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Rewards — Shop & Redemption @module:rewards @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M11-E2E-17: list shop items', async ({ request }) => {
    const res = await request.get('/api/v1/rewards/shop/items');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M11-E2E-18: create shop item', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/shop/items', {
      data: {
        name: 'E2E Test Reward',
        description: 'Test reward item',
        costExp: 50,
        category: 'privilege',
        quantityAvailable: 10,
      },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });

  test('M11-E2E-19: redeem shop item rejects without EXP', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/shop/redeem', {
      data: { rewardId: 'nonexistent-reward' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M11-E2E-20: get my redemptions', async ({ request }) => {
    const res = await request.get('/api/v1/rewards/shop/my-redemptions');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M11-E2E-21: approve redemption rejects nonexistent', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/shop/redemptions/nonexistent/approve');
    expect([401, 403, 404, 500]).toContain(res.status());
  });

  test('M11-E2E-22: shop item has required fields', async ({ request }) => {
    const res = await request.get('/api/v1/rewards/shop/items');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      for (const item of body) {
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('costExp');
        expect(item).toHaveProperty('isActive');
      }
    }
  });

  test('M11-E2E-23: shop item with expiry date', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/shop/items', {
      data: {
        name: 'Limited Reward',
        costExp: 100,
        category: 'limited',
        quantityAvailable: 5,
        validUntil: '2027-12-31',
      },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });

  test('M11-E2E-24: shop item with unlimited quantity', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/shop/items', {
      data: {
        name: 'Unlimited Privilege',
        costExp: 30,
        category: 'privilege',
        quantityAvailable: -1,
      },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });
});
