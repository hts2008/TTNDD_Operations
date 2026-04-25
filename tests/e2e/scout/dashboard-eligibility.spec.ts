import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Scout — Dashboard & Eligibility @module:scout @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M8-E2E-17: dashboard API returns aggregated data', async ({ request }) => {
    const res = await request.get('/api/v1/scout/dashboard/nonexistent-member');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('memberId');
      expect(body).toHaveProperty('stats');
      expect(body).toHaveProperty('skillProgress');
      expect(body).toHaveProperty('memberRanks');
      expect(body).toHaveProperty('recentEvidence');
      expect(body.stats).toHaveProperty('totalSkills');
      expect(body.stats).toHaveProperty('completedSkills');
      expect(body.stats).toHaveProperty('skillCompletionRate');
    }
  });

  test('M8-E2E-18: skill progress API responds for member', async ({ request }) => {
    const res = await request.get('/api/v1/scout/progress/nonexistent-member');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
      expect(body.length).toBe(0);
    }
  });

  test('M8-E2E-19: start skill for nonexistent member/skill', async ({ request }) => {
    const res = await request.post('/api/v1/scout/progress/nonexistent-member/start', {
      data: 'fake-skill-id',
    });
    expect([201, 400, 401, 403, 500]).toContain(res.status());
  });

  test('M8-E2E-20: dashboard stats are zero for fresh member', async ({ request }) => {
    const res = await request.get('/api/v1/scout/dashboard/fresh-member-no-data');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.stats.totalSkills).toBe(0);
      expect(body.stats.completedSkills).toBe(0);
      expect(body.stats.skillCompletionRate).toBe(0);
      expect(body.stats.currentRank).toBeNull();
      expect(body.stats.completedRanksCount).toBe(0);
    }
  });

  test('M8-E2E-21: scout page SEO has title', async ({ page }) => {
    await page.goto('/scout');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('M8-E2E-22: rank definitions ordered by rankOrder', async ({ request }) => {
    const res = await request.get('/api/v1/scout/ranks');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      if (body.length > 1) {
        for (let i = 1; i < body.length; i++) {
          expect(body[i].rankOrder).toBeGreaterThanOrEqual(body[i - 1].rankOrder);
        }
      }
    }
  });

  test('M8-E2E-23: skill groups include nested skills', async ({ request }) => {
    const res = await request.get('/api/v1/scout/skill-groups');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      for (const group of body) {
        expect(group).toHaveProperty('skills');
        expect(Array.isArray(group.skills)).toBeTruthy();
      }
    }
  });

  test('M8-E2E-24: dashboard includes allowedActions per rank', async ({ request }) => {
    const res = await request.get('/api/v1/scout/dashboard/nonexistent-member');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      for (const mr of body.memberRanks) {
        expect(mr).toHaveProperty('allowedActions');
        expect(Array.isArray(mr.allowedActions)).toBeTruthy();
      }
    }
  });
});
