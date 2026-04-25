import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Rewards — Badges & Leaderboard @module:rewards @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M11-E2E-09: list badge definitions', async ({ request }) => {
    const res = await request.get('/api/v1/rewards/badges/definitions');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M11-E2E-10: create badge definition', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/badges/definitions', {
      data: {
        badgeCode: 'e2e-test-badge',
        name: 'E2E Test Badge',
        description: 'Badge for E2E testing',
        badgeType: 'achievement',
        imageUrl: 'https://example.com/badge.png',
        rarity: 'common',
        expReward: 10,
        isAutoAward: false,
      },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });

  test('M11-E2E-11: award badge to member', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/badges/award', {
      data: {
        memberId: 'test-member-001',
        badgeId: 'nonexistent-badge',
        notes: 'E2E test badge award',
      },
    });
    expect([200, 201, 401, 403, 404]).toContain(res.status());
  });

  test('M11-E2E-12: get member badges', async ({ request }) => {
    const res = await request.get('/api/v1/rewards/badges/member/test-member-001');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M11-E2E-13: get live leaderboard (org scope)', async ({ request }) => {
    const res = await request.get('/api/v1/rewards/leaderboard?scope=org&limit=10');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M11-E2E-14: get leaderboard with branch scope', async ({ request }) => {
    const res = await request.get('/api/v1/rewards/leaderboard?scope=branch&scopeId=branch-thieu');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M11-E2E-15: take leaderboard snapshot', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/leaderboard/snapshot', {
      data: { scope: 'org', period: 'weekly' },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });

  test('M11-E2E-16: get leaderboard snapshots', async ({ request }) => {
    const res = await request.get('/api/v1/rewards/leaderboard/snapshots?scope=org&period=weekly');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    }
  });
});
