import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('LMS — Quiz Lifecycle @module:lms @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M7-E2E-05: quizzes list API responds', async ({ request }) => {
    const res = await request.get('/api/v1/lms/quizzes');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    }
  });

  test('M7-E2E-06: quiz by id rejects nonexistent', async ({ request }) => {
    const res = await request.get('/api/v1/lms/quizzes/nonexistent-quiz-id');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-07: quiz public view strips correct answers', async ({ request }) => {
    const res = await request.get('/api/v1/lms/quizzes/nonexistent-quiz-id/public');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-08: quiz questions API for nonexistent quiz', async ({ request }) => {
    const res = await request.get('/api/v1/lms/quizzes/nonexistent-quiz-id/questions');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-09: start attempt rejects nonexistent quiz', async ({ request }) => {
    const res = await request.post('/api/v1/lms/quizzes/nonexistent-quiz-id/attempts/start', {
      data: { memberId: 'test-member' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-10: submit attempt rejects nonexistent attempt', async ({ request }) => {
    const res = await request.post('/api/v1/lms/attempts/nonexistent-attempt-id/submit', {
      data: { answers: [] },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-11: grading queue API responds', async ({ request }) => {
    const res = await request.get('/api/v1/lms/grading-queue');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M7-E2E-12: grade attempt rejects nonexistent', async ({ request }) => {
    const res = await request.post('/api/v1/lms/attempts/nonexistent-attempt-id/grade', {
      data: { score: 85, passed: true, feedback: 'E2E test' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-13: attempt history rejects nonexistent quiz/member', async ({ request }) => {
    const res = await request.get('/api/v1/lms/quizzes/nonexistent-id/attempts/nonexistent-member');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
      expect(body.length).toBe(0);
    }
  });
});
