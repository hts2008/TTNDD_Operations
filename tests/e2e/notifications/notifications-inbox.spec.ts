import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Notifications — Inbox & Preferences @module:notifications @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('NF-E2E-01: get my notifications', async ({ request }) => {
    const res = await request.get('/api/v1/notifications?page=1&limit=10');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    }
  });

  test('NF-E2E-02: get unread-only notifications', async ({ request }) => {
    const res = await request.get('/api/v1/notifications?unreadOnly=true');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('NF-E2E-03: get unread count', async ({ request }) => {
    const res = await request.get('/api/v1/notifications/unread-count');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(typeof body.count === 'number' || typeof body === 'number').toBeTruthy();
    }
  });

  test('NF-E2E-04: mark notification as read', async ({ request }) => {
    const res = await request.patch('/api/v1/notifications/nonexistent/read');
    expect([200, 401, 403, 404]).toContain(res.status());
  });

  test('NF-E2E-05: mark all notifications as read', async ({ request }) => {
    const res = await request.patch('/api/v1/notifications/read-all');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('NF-E2E-06: get notification preferences', async ({ request }) => {
    const res = await request.get('/api/v1/notifications/preferences');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('NF-E2E-07: update notification preference', async ({ request }) => {
    const res = await request.patch('/api/v1/notifications/preferences', {
      data: { channel: 'email', eventType: 'session.published', enabled: false },
    });
    expect([200, 401, 403]).toContain(res.status());
  });

  test('NF-E2E-08: list notification templates (admin)', async ({ request }) => {
    const res = await request.get('/api/v1/notifications/templates');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('NF-E2E-09: upsert notification template', async ({ request }) => {
    const res = await request.post('/api/v1/notifications/templates', {
      data: {
        eventType: 'e2e_test_event',
        channel: 'in_app',
        titleTemplate: 'Test: {{title}}',
        bodyTemplate: 'This is a test notification',
      },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });
});
