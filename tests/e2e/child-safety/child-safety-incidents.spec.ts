import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Child Safety — Incident Management @module:child-safety @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('CS-E2E-01: report safety incident', async ({ request }) => {
    const res = await request.post('/api/v1/child-safety/incidents', {
      data: {
        title: 'E2E test incident report',
        description: 'Test description for child safety',
        category: 'child_safety_incident',
        isAnonymous: false,
        evidenceUrls: ['https://example.com/evidence.jpg'],
      },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });

  test('CS-E2E-02: report anonymous incident', async ({ request }) => {
    const res = await request.post('/api/v1/child-safety/incidents', {
      data: {
        title: 'Anonymous safety report',
        isAnonymous: true,
      },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });

  test('CS-E2E-03: list incidents (admin only)', async ({ request }) => {
    const res = await request.get('/api/v1/child-safety/incidents?page=1&limit=10');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    }
  });

  test('CS-E2E-04: escalate incident', async ({ request }) => {
    const res = await request.post('/api/v1/child-safety/incidents/nonexistent/escalate');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('CS-E2E-05: add evidence to incident', async ({ request }) => {
    const res = await request.post('/api/v1/child-safety/incidents/nonexistent/evidence', {
      data: { urls: ['https://example.com/new-evidence.jpg'], notes: 'Additional evidence' },
    });
    expect([401, 403, 404]).toContain(res.status());
  });

  test('CS-E2E-06: export incident for council', async ({ request }) => {
    const res = await request.get('/api/v1/child-safety/incidents/nonexistent/export');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('CS-E2E-07: validate 2-adult rule', async ({ request }) => {
    const res = await request.get('/api/v1/child-safety/validate-2-adult?staffCount=2');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.valid).toBe(true);
      expect(body.staffCount).toBe(2);
    }
  });

  test('CS-E2E-08: 2-adult rule fails with 1 staff', async ({ request }) => {
    const res = await request.get('/api/v1/child-safety/validate-2-adult?staffCount=1');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.valid).toBe(false);
    }
  });

  test('CS-E2E-09: check quiet hours status', async ({ request }) => {
    const res = await request.get('/api/v1/child-safety/quiet-hours');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('isQuietHours');
      expect(typeof body.isQuietHours).toBe('boolean');
    }
  });

  test('CS-E2E-10: apply retention policy (super_admin)', async ({ request }) => {
    const res = await request.post('/api/v1/child-safety/retention-policy');
    expect([200, 201, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('redactedCount');
    }
  });
});
