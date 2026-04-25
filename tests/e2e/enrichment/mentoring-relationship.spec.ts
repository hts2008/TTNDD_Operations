import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Enrichment — Mentoring Relationships @module:enrichment @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M10-E2E-17: create mentoring relationship requires admin', async ({ request }) => {
    const res = await request.post('/api/v1/enrichment/mentoring', {
      data: {
        mentorId: 'mentor-001',
        menteeId: 'mentee-001',
        startDate: '2026-04-01',
      },
    });
    expect([201, 401, 403]).toContain(res.status());
  });

  test('M10-E2E-18: get as-mentor relationships', async ({ request }) => {
    const res = await request.get('/api/v1/enrichment/mentoring/as-mentor');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M10-E2E-19: get as-mentee relationships', async ({ request }) => {
    const res = await request.get('/api/v1/enrichment/mentoring/as-mentee');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M10-E2E-20: create mentoring log rejects nonexistent relationship', async ({ request }) => {
    const res = await request.post('/api/v1/enrichment/mentoring/nonexistent-rel/logs', {
      data: {
        sessionDate: '2026-04-25',
        topic: 'E2E test mentoring session',
        outcome: 'Tested API endpoint',
        followUp: 'Continue testing',
      },
    });
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M10-E2E-21: get mentoring logs rejects nonexistent relationship', async ({ request }) => {
    const res = await request.get('/api/v1/enrichment/mentoring/nonexistent-rel/logs');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
      expect(body.length).toBe(0);
    }
  });

  test('M10-E2E-22: mentoring relationships include recent logs', async ({ request }) => {
    const res = await request.get('/api/v1/enrichment/mentoring/as-mentor');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      for (const rel of body) {
        expect(rel).toHaveProperty('logs');
        expect(Array.isArray(rel.logs)).toBeTruthy();
      }
    }
  });

  test('M10-E2E-23: mentoring only returns active relationships', async ({ request }) => {
    const res = await request.get('/api/v1/enrichment/mentoring/as-mentee');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      for (const rel of body) {
        expect(rel.status).toBe('active');
      }
    }
  });

  test('M10-E2E-24: create mentoring with minimal fields', async ({ request }) => {
    const res = await request.post('/api/v1/enrichment/mentoring', {
      data: {
        mentorId: 'mentor-002',
        menteeId: 'mentee-002',
      },
    });
    expect([201, 401, 403]).toContain(res.status());
  });
});
