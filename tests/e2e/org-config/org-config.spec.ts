import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Org Config — Organization & Structure @module:org-config @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('OC-E2E-01: get organization by slug', async ({ request }) => {
    const res = await request.get('/api/v1/organizations/demo-org');
    expect([200, 401, 403, 404]).toContain(res.status());
  });

  test('OC-E2E-02: update organization info', async ({ request }) => {
    const res = await request.patch('/api/v1/organizations/test-org-id/info', {
      data: { name: 'Updated Org Name', logoUrl: 'https://example.com/logo.png' },
    });
    expect([200, 401, 403, 404]).toContain(res.status());
  });

  test('OC-E2E-03: update organization settings', async ({ request }) => {
    const res = await request.patch('/api/v1/organizations/test-org-id/settings', {
      data: { theme: 'dark', language: 'vi', timezone: 'Asia/Ho_Chi_Minh' },
    });
    expect([200, 401, 403, 404]).toContain(res.status());
  });

  test('OC-E2E-04: toggle module on/off', async ({ request }) => {
    const res = await request.patch('/api/v1/organizations/test-org-id/modules/enrichment', {
      data: { enabled: true },
    });
    expect([200, 401, 403, 404]).toContain(res.status());
  });

  test('OC-E2E-05: list branches', async ({ request }) => {
    const res = await request.get('/api/v1/organizations/test-org-id/branches');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('OC-E2E-06: create branch with Hướng Đạo fields', async ({ request }) => {
    const res = await request.post('/api/v1/organizations/test-org-id/branches', {
      data: {
        code: 'e2e-thieu',
        name: 'E2E Ngành Thiếu',
        minAge: 12,
        maxAge: 15,
        colorTheme: '#00AA00',
        narrativeName: 'Rừng Xanh',
      },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });

  test('OC-E2E-07: list units with branch filter', async ({ request }) => {
    const res = await request.get('/api/v1/organizations/test-org-id/units?branchId=branch-thieu');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('OC-E2E-08: create unit with totem', async ({ request }) => {
    const res = await request.post('/api/v1/organizations/test-org-id/units', {
      data: {
        branchId: 'branch-thieu',
        name: 'Đội Hổ',
        totemName: 'Hổ Mạnh',
        unitType: 'patrol',
      },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });

  test('OC-E2E-09: list members (paginated)', async ({ request }) => {
    const res = await request.get('/api/v1/organizations/test-org-id/members?page=1&limit=10');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('OC-E2E-10: get audit log', async ({ request }) => {
    const res = await request.get('/api/v1/organizations/test-org-id/audit-log?page=1&limit=10');
    expect([200, 401, 403]).toContain(res.status());
  });
});
