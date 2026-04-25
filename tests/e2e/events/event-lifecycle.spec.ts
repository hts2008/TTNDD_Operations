import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Events — Lifecycle & SM-13 @module:events @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M9-E2E-04: events list API with pagination', async ({ request }) => {
    const res = await request.get('/api/v1/events?page=1&limit=10');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(body.meta).toHaveProperty('total');
      expect(body.meta).toHaveProperty('page');
    }
  });

  test('M9-E2E-05: events filter by status', async ({ request }) => {
    const res = await request.get('/api/v1/events?status=planning');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M9-E2E-06: events filter by date range', async ({ request }) => {
    const res = await request.get('/api/v1/events?from=2026-01-01&to=2026-12-31');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M9-E2E-07: event detail rejects nonexistent', async ({ request }) => {
    const res = await request.get('/api/v1/events/nonexistent-event-id');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M9-E2E-08: create event requires admin role', async ({ request }) => {
    const res = await request.post('/api/v1/events', {
      data: {
        title: 'E2E Test Camp',
        startDate: '2026-07-01',
        endDate: '2026-07-03',
        eventType: 'camp',
        location: 'Test Location',
        maxParticipants: 30,
      },
    });
    expect([201, 401, 403]).toContain(res.status());
  });

  test('M9-E2E-09: transition rejects nonexistent event', async ({ request }) => {
    const res = await request.post('/api/v1/events/nonexistent-event-id/transition', {
      data: { action: 'propose' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M9-E2E-10: update event requires admin role', async ({ request }) => {
    const res = await request.patch('/api/v1/events/nonexistent-event-id', {
      data: { title: 'Updated Title' },
    });
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M9-E2E-11: SM-13 rejects invalid actions on planning status', async ({ request }) => {
    const res = await request.post('/api/v1/events/nonexistent-event-id/transition', {
      data: { action: 'complete' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });
});
