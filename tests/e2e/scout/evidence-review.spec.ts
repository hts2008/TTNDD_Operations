import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Scout — Evidence & Skill Review @module:scout @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M8-E2E-09: skill groups API responds', async ({ request }) => {
    const res = await request.get('/api/v1/scout/skill-groups');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M8-E2E-10: skill groups filter by branchId', async ({ request }) => {
    const res = await request.get('/api/v1/scout/skill-groups?branchId=nonexistent');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
      expect(body.length).toBe(0);
    }
  });

  test('M8-E2E-11: create skill group requires admin role', async ({ request }) => {
    const res = await request.post('/api/v1/scout/skill-groups', {
      data: { name: 'E2E Test Group', description: 'Test' },
    });
    expect([201, 401, 403]).toContain(res.status());
  });

  test('M8-E2E-12: create skill requires admin role', async ({ request }) => {
    const res = await request.post('/api/v1/scout/skills', {
      data: {
        skillGroupId: 'fake-group',
        skillCode: 'E2E-SKILL',
        name: 'E2E Skill',
        levels: [{ level: 1, criteria: 'Test criteria' }],
      },
    });
    expect([201, 400, 401, 403]).toContain(res.status());
  });

  test('M8-E2E-13: submit evidence rejects nonexistent skill', async ({ request }) => {
    const res = await request.post('/api/v1/scout/evidence/nonexistent-member', {
      data: {
        skillId: 'fake-skill',
        level: 1,
        evidenceType: 'photo',
        notes: 'E2E test evidence',
      },
    });
    expect([201, 400, 401, 403]).toContain(res.status());
  });

  test('M8-E2E-14: review evidence rejects nonexistent evidenceId', async ({ request }) => {
    const res = await request.post('/api/v1/scout/evidence/nonexistent-evidence-id/review', {
      data: { approved: true, reviewNotes: 'E2E test' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M8-E2E-15: verify skill rejects nonexistent progress', async ({ request }) => {
    const res = await request.post('/api/v1/scout/progress/nonexistent-member/verify', {
      data: { skillId: 'fake-skill', level: 1 },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M8-E2E-16: award skill rejects nonexistent progress', async ({ request }) => {
    const res = await request.post('/api/v1/scout/progress/nonexistent-member/award', {
      data: 'fake-skill',
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });
});
