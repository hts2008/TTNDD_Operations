import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Process — Workflow Runs @module:process @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M6-E2E-09: workflow definitions API responds', async ({ request }) => {
    const res = await request.get('/api/v1/process/definitions');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    }
  });

  test('M6-E2E-10: workflow runs API responds', async ({ request }) => {
    const res = await request.get('/api/v1/process/runs');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M6-E2E-11: start run rejects nonexistent definition', async ({ request }) => {
    const res = await request.post('/api/v1/process/runs', {
      data: { definitionId: 'nonexistent-def-id' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M6-E2E-12: advance step rejects nonexistent run', async ({ request }) => {
    const res = await request.post('/api/v1/process/runs/nonexistent-run/advance', {
      data: { status: 'completed', notes: 'E2E test' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M6-E2E-13: graph-run start rejects nonexistent definition', async ({ request }) => {
    const res = await request.post('/api/v1/process/graph-runs', {
      data: { definitionId: 'nonexistent-graph-def' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M6-E2E-14: stuck runs API responds', async ({ request }) => {
    const res = await request.get('/api/v1/process/graph-runs/stuck?thresholdMinutes=60');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('count');
      expect(body).toHaveProperty('runs');
    }
  });

  test('M6-E2E-15: trigger endpoint responds', async ({ request }) => {
    const res = await request.post('/api/v1/process/graph-runs/trigger', {
      data: { eventType: 'test.event', payload: { key: 'value' } },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('triggered');
      expect(body).toHaveProperty('count');
    }
  });

  test('M6-E2E-16: run history rejects nonexistent run', async ({ request }) => {
    const res = await request.get('/api/v1/process/graph-runs/nonexistent-run/history');
    expect([401, 403, 404]).toContain(res.status());
  });
});
