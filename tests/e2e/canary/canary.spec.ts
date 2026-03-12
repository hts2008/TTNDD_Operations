import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080';

test.describe('Canary — Post-Deploy Health @module:canary @gate', () => {
  test('C1: /health returns 200 with status ok', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeTruthy();
  });

  test('C2: /health/canary returns DB status', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health/canary`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.checks).toBeTruthy();
    expect(body.checks.database).toBeTruthy();
    expect(body.checks.database.status).toBeTruthy();
  });

  test('C3: /health response time under 2s', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${API_BASE}/health`);
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(2000);
  });
});
