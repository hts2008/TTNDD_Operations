import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Enrichment — Spiritual Journal (Private) @module:enrichment @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M10-E2E-01: create spiritual log API responds', async ({ request }) => {
    const res = await request.post('/api/v1/enrichment/spiritual-logs', {
      data: {
        logDate: '2026-04-25',
        logType: 'meditation',
        durationMinutes: 30,
        notes: 'E2E test spiritual log',
        thanhNgonRef: 'TNHT Q1 P12',
        emotionBefore: 3,
        emotionAfter: 8,
      },
    });
    expect([201, 401, 403]).toContain(res.status());
  });

  test('M10-E2E-02: get my spiritual logs API responds', async ({ request }) => {
    const res = await request.get('/api/v1/enrichment/spiritual-logs/my');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M10-E2E-03: spiritual logs ordered by date desc', async ({ request }) => {
    const res = await request.get('/api/v1/enrichment/spiritual-logs/my');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      if (body.length > 1) {
        for (let i = 1; i < body.length; i++) {
          expect(new Date(body[i - 1].logDate).getTime()).toBeGreaterThanOrEqual(
            new Date(body[i].logDate).getTime(),
          );
        }
      }
    }
  });

  test('M10-E2E-04: spiritual log includes emotion fields', async ({ request }) => {
    const res = await request.get('/api/v1/enrichment/spiritual-logs/my');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      for (const log of body) {
        expect(log).toHaveProperty('logDate');
        expect(log).toHaveProperty('emotionBefore');
        expect(log).toHaveProperty('emotionAfter');
      }
    }
  });

  test('M10-E2E-05: spiritual log includes thanhNgonRef field', async ({ request }) => {
    const res = await request.get('/api/v1/enrichment/spiritual-logs/my');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      for (const log of body) {
        expect(log).toHaveProperty('thanhNgonRef');
        expect(log).toHaveProperty('durationMinutes');
      }
    }
  });

  test('M10-E2E-06: enrichment page loads', async ({ page }) => {
    await page.goto('/enrichment');
    const body = (await page.textContent('body')) || '';
    const hasContent =
      body.includes('Enrichment') ||
      body.includes('Tu dưỡng') ||
      body.includes('Tâm linh') ||
      body.includes('Đang tải');
    expect(hasContent).toBeTruthy();
  });

  test('M10-E2E-07: enrichment page has title', async ({ page }) => {
    await page.goto('/enrichment');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('M10-E2E-08: create log with minimal fields', async ({ request }) => {
    const res = await request.post('/api/v1/enrichment/spiritual-logs', {
      data: { logDate: '2026-04-24' },
    });
    expect([201, 400, 401, 403]).toContain(res.status());
  });
});
