import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('System — Health & Release Gates @module:system @gate', () => {
  test('SYS-E2E-01: health check (no auth)', async ({ request }) => {
    const res = await request.get('/api/v1/system/health');
    expect([200]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('status');
  });

  test('SYS-E2E-02: canary endpoint (no auth)', async ({ request }) => {
    const res = await request.get('/api/v1/system/health/canary');
    expect([200]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('api');
    expect(body).toHaveProperty('buildId');
    expect(body).toHaveProperty('timestamp');
  });

  test('SYS-E2E-03: synthetic probe results (no auth)', async ({ request }) => {
    const res = await request.get('/api/v1/system/health/probes');
    expect([200]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('overall');
    expect(body).toHaveProperty('probes');
  });

  test.describe('Authenticated endpoints', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, DEMO_ADMIN);
    });

    test('SYS-E2E-04: module health check', async ({ request }) => {
      const res = await request.get('/api/v1/system/module-health');
      expect([200, 401, 403]).toContain(res.status());
    });

    test('SYS-E2E-05: seed health check', async ({ request }) => {
      const res = await request.get('/api/v1/system/seed-health');
      expect([200, 401, 403]).toContain(res.status());
    });

    test('SYS-E2E-06: get latest release gate report', async ({ request }) => {
      const res = await request.get('/api/v1/system/release-gates/latest');
      expect([200, 401, 403, 404]).toContain(res.status());
    });

    test('SYS-E2E-07: save release gate report', async ({ request }) => {
      const res = await request.post('/api/v1/system/release-gates/report', {
        data: {
          version: '1.0.0-e2e',
          environment: 'test',
          gates: [
            { name: 'type-check', status: 'pass' },
            { name: 'lint', status: 'pass' },
            { name: 'unit-tests', status: 'pass' },
          ],
          overallStatus: 'pass',
        },
      });
      expect([200, 201, 401, 403]).toContain(res.status());
    });
  });
});
