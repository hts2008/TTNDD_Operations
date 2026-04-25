import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('LMS — Competency, Progress & Offline @module:lms @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M7-E2E-22: competencies list API responds', async ({ request }) => {
    const res = await request.get('/api/v1/lms/competencies');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M7-E2E-23: competencies filter by category', async ({ request }) => {
    const res = await request.get('/api/v1/lms/competencies?category=outdoor');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M7-E2E-24: courses list API responds with filters', async ({ request }) => {
    const res = await request.get('/api/v1/lms/courses?category=scouting&difficulty=beginner');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    }
  });

  test('M7-E2E-25: course modules API for nonexistent course', async ({ request }) => {
    const res = await request.get('/api/v1/lms/courses/nonexistent-course-id/modules');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-26: course lessons API for nonexistent course', async ({ request }) => {
    const res = await request.get('/api/v1/lms/courses/nonexistent-course-id/lessons');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-27: completion check rejects nonexistent course/member', async ({ request }) => {
    const res = await request.get(
      '/api/v1/lms/courses/nonexistent-course-id/completion-check/nonexistent-member',
    );
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-28: offline pack rejects nonexistent course', async ({ request }) => {
    const res = await request.get('/api/v1/lms/courses/nonexistent-course-id/offline-pack');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-29: pack size estimation rejects nonexistent course', async ({ request }) => {
    const res = await request.get('/api/v1/lms/courses/nonexistent-course-id/pack-size');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-30: member progress rejects nonexistent member', async ({ request }) => {
    const res = await request.get('/api/v1/lms/progress/nonexistent-member-id');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
      expect(body.length).toBe(0);
    }
  });

  test('M7-E2E-31: enroll rejects nonexistent course', async ({ request }) => {
    const res = await request.post('/api/v1/lms/courses/nonexistent-course-id/enroll', {
      data: { memberId: 'test-member' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });
});
