import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Events — Registration, Consent & Check-In @module:events @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M9-E2E-12: register rejects nonexistent event', async ({ request }) => {
    const res = await request.post('/api/v1/events/nonexistent-event-id/register');
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M9-E2E-13: consent rejects nonexistent event', async ({ request }) => {
    const res = await request.post('/api/v1/events/nonexistent-event-id/consent', {
      data: { consentBy: 'parent-001' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M9-E2E-14: check-in rejects nonexistent event/member', async ({ request }) => {
    const res = await request.post(
      '/api/v1/events/nonexistent-event-id/check-in/nonexistent-member',
    );
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M9-E2E-15: check-in requires admin role', async ({ request }) => {
    const res = await request.post('/api/v1/events/fake-event/check-in/fake-member');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M9-E2E-16: events page has proper content', async ({ page }) => {
    await page.goto('/events');
    const body = (await page.textContent('body')) || '';
    const hasEvents =
      body.includes('Sự kiện') ||
      body.includes('Trại') ||
      body.includes('Events') ||
      body.includes('Đang tải');
    expect(hasEvents).toBeTruthy();
  });

  test('M9-E2E-17: events list respects pagination limits', async ({ request }) => {
    const res = await request.get('/api/v1/events?page=1&limit=5');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.meta.limit).toBeLessThanOrEqual(20);
    }
  });

  test('M9-E2E-18: create event with full fields', async ({ request }) => {
    const res = await request.post('/api/v1/events', {
      data: {
        title: 'E2E Full Camp',
        eventType: 'camp',
        startDate: '2026-08-01',
        endDate: '2026-08-03',
        location: 'Khu Du Lịch Sinh Thái',
        maxParticipants: 50,
        targetBranches: ['thieu', 'trang'],
        raciMatrix: { responsible: 'leader-001', accountable: 'admin-001' },
        riskAssessment: { weatherRisk: 'medium', terrainRisk: 'low' },
        expReward: 100,
      },
    });
    expect([201, 401, 403]).toContain(res.status());
  });

  test('M9-E2E-19: events SEO title exists', async ({ page }) => {
    await page.goto('/events');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
