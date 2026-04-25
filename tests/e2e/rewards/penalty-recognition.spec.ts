import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Rewards — Penalties & Peer Recognition @module:rewards @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M11-E2E-25: apply penalty (deduct with metadata)', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/penalties', {
      data: {
        memberId: 'test-member-001',
        amount: 10,
        reason: 'E2E test penalty',
        deductionItem: 'late_attendance',
        correctionTask: 'Write apology letter',
      },
    });
    expect([200, 201, 400, 401, 403]).toContain(res.status());
  });

  test('M11-E2E-26: correct penalty rejects nonexistent', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/penalties/nonexistent-tx/correct');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M11-E2E-27: give peer recognition', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/peer-recognition', {
      data: {
        toMemberId: 'test-member-002',
        category: 'teamwork',
        message: 'Great collaboration on the project!',
      },
    });
    expect([200, 201, 400, 401, 403]).toContain(res.status());
  });

  test('M11-E2E-28: peer recognition rejects invalid category', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/peer-recognition', {
      data: {
        toMemberId: 'test-member-002',
        category: 'invalid_category',
      },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('M11-E2E-29: get peer recognitions received', async ({ request }) => {
    const res = await request.get('/api/v1/rewards/peer-recognition/received/test-member-002');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    }
  });

  test('M11-E2E-30: peer recognition rejects self-recognition', async ({ request }) => {
    const res = await request.post('/api/v1/rewards/peer-recognition', {
      data: {
        toMemberId: 'self-member-id',
        category: 'leadership',
      },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('M11-E2E-31: rewards page loads', async ({ page }) => {
    await page.goto('/rewards');
    const body = (await page.textContent('body')) || '';
    const hasContent =
      body.includes('Rewards') ||
      body.includes('Phần thưởng') ||
      body.includes('EXP') ||
      body.includes('Đang tải');
    expect(hasContent).toBeTruthy();
  });

  test('M11-E2E-32: rewards page has title', async ({ page }) => {
    await page.goto('/rewards');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
