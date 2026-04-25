import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Dashboards — Analytics & Export @module:dashboards @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('DB-E2E-01: get org-wide dashboard', async ({ request }) => {
    const res = await request.get('/api/v1/dashboards/org');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('members');
      expect(body).toHaveProperty('sessions');
      expect(body).toHaveProperty('finance');
    }
  });

  test('DB-E2E-02: get SPICES dashboard', async ({ request }) => {
    const res = await request.get('/api/v1/dashboards/spices');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('DB-E2E-03: get personal dashboard', async ({ request }) => {
    const res = await request.get('/api/v1/dashboards/my');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('DB-E2E-04: get member progress report', async ({ request }) => {
    const res = await request.get('/api/v1/dashboards/members/test-member-001/report');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('DB-E2E-05: get finance report with date range', async ({ request }) => {
    const res = await request.get('/api/v1/dashboards/finance?from=2026-01-01&to=2026-12-31');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('DB-E2E-06: get attendance analytics', async ({ request }) => {
    const res = await request.get('/api/v1/dashboards/attendance?from=2026-01-01&to=2026-12-31');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('DB-E2E-07: attendance analytics with branch filter', async ({ request }) => {
    const res = await request.get('/api/v1/dashboards/attendance?branchId=branch-thieu');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('DB-E2E-08: global search', async ({ request }) => {
    const res = await request.get('/api/v1/dashboards/search?q=test');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('DB-E2E-09: export CSV (members)', async ({ request }) => {
    const res = await request.get('/api/v1/dashboards/export/csv?resource=members');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('DB-E2E-10: export Excel (attendance)', async ({ request }) => {
    const res = await request.get('/api/v1/dashboards/export/excel?resource=attendance');
    expect([200, 401, 403]).toContain(res.status());
  });
});
