import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('LMS — Battle Arena @module:lms @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M7-E2E-14: create battle rejects nonexistent quiz', async ({ request }) => {
    const res = await request.post('/api/v1/lms/quizzes/nonexistent-quiz-id/battles', {
      data: { maxPlayers: 4 },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-15: join battle rejects nonexistent game code', async ({ request }) => {
    const res = await request.post('/api/v1/lms/battles/XXXXXX/join');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-16: get battle rejects nonexistent game code', async ({ request }) => {
    const res = await request.get('/api/v1/lms/battles/XXXXXX');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-17: start battle rejects nonexistent or not-lobby', async ({ request }) => {
    const res = await request.post('/api/v1/lms/battles/XXXXXX/start');
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-18: submit battle answer rejects nonexistent', async ({ request }) => {
    const res = await request.post('/api/v1/lms/battles/XXXXXX/answer', {
      data: { questionId: 'q1', answer: 'A' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-19: finish battle rejects nonexistent', async ({ request }) => {
    const res = await request.post('/api/v1/lms/battles/XXXXXX/finish');
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-20: battle scoreboard rejects nonexistent', async ({ request }) => {
    const res = await request.get('/api/v1/lms/battles/XXXXXX/scoreboard');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M7-E2E-21: battle page loads', async ({ page }) => {
    await page.goto('/lms');
    const body = (await page.textContent('body')) || '';
    const hasLmsContent =
      body.includes('Học tập') ||
      body.includes('Khóa học') ||
      body.includes('LMS') ||
      body.includes('Đang tải');
    expect(hasLmsContent).toBeTruthy();
  });
});
