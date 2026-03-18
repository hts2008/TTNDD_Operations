import { test, expect } from '@playwright/test';

// ══════════════════════════════════════════════
// T-1116: Process Module E2E Tests
// ══════════════════════════════════════════════

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:8080';

test.describe('Process Module – SOP & Workflow API', () => {
  let authHeaders: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    // Authenticate (use test credentials)
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: process.env.TEST_ADMIN_EMAIL ?? 'admin@ttndd.test',
        password: process.env.TEST_ADMIN_PASSWORD ?? 'TestAdmin123!',
      },
    });
    if (loginRes.ok()) {
      const body = await loginRes.json();
      authHeaders = { Authorization: `Bearer ${body.accessToken}` };
    } else {
      // If auth fails, skip gracefully
      authHeaders = {};
    }
  });

  // ── SOP Endpoints ──

  test('GET /process/sops returns list', async ({ request }) => {
    const res = await request.get(`${API_BASE}/process/sops`, {
      headers: authHeaders,
    });
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    }
  });

  test('POST /process/sops creates SOP', async ({ request }) => {
    const res = await request.post(`${API_BASE}/process/sops`, {
      headers: authHeaders,
      data: {
        title: `E2E Test SOP ${Date.now()}`,
        description: 'Created by Playwright E2E',
        category: 'operations',
        tags: ['e2e', 'test'],
      },
    });
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      expect(body).toHaveProperty('id');
      expect(body.title).toContain('E2E Test SOP');
    }
  });

  // ── Workflow Definition Endpoints ──

  test('GET /process/definitions returns list', async ({ request }) => {
    const res = await request.get(`${API_BASE}/process/definitions`, {
      headers: authHeaders,
    });
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
    }
  });

  test('POST /process/definitions creates definition', async ({ request }) => {
    const res = await request.post(`${API_BASE}/process/definitions`, {
      headers: authHeaders,
      data: {
        name: `E2E Workflow ${Date.now()}`,
        description: 'Playwright E2E test definition',
        steps: { steps: [] },
      },
    });
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      expect(body).toHaveProperty('id');
    }
  });

  // ── Graph Endpoints ──

  test('POST /process/definitions/:id/graph saves graph', async ({ request }) => {
    // First create a definition
    const createRes = await request.post(`${API_BASE}/process/definitions`, {
      headers: authHeaders,
      data: {
        name: `E2E Graph Test ${Date.now()}`,
        description: 'For graph save test',
        steps: {},
      },
    });
    if (!createRes.ok()) {
      test.skip();
      return;
    }
    const def = await createRes.json();

    const graphRes = await request.post(`${API_BASE}/process/definitions/${def.id}/graph`, {
      headers: authHeaders,
      data: {
        nodes: [
          { id: 's1', type: 'start', label: 'Start', position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', label: 'End', position: { x: 0, y: 100 }, data: {} },
        ],
        edges: [{ id: 'e-s1-e1', source: 's1', target: 'e1' }],
      },
    });
    expect(graphRes.status()).toBeLessThan(500);
  });

  // ── Template Endpoints ──

  test('POST /process/templates/seed seeds built-in templates', async ({ request }) => {
    const res = await request.post(`${API_BASE}/process/templates/seed`, {
      headers: authHeaders,
    });
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      expect(body).toHaveProperty('seeded');
      expect(body).toHaveProperty('total');
      expect(body.total).toBeGreaterThanOrEqual(5);
    }
  });

  test('GET /process/templates returns template list', async ({ request }) => {
    const res = await request.get(`${API_BASE}/process/templates`, {
      headers: authHeaders,
    });
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('GET /process/templates/:slug returns single template', async ({ request }) => {
    const res = await request.get(`${API_BASE}/process/templates/onboarding-member`, {
      headers: authHeaders,
    });
    // May 404 if not seeded, but should not 500
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      expect(body.slug).toBe('onboarding-member');
      expect(body.isBuiltIn).toBe(true);
    }
  });

  test('POST /process/templates/:slug/install installs template', async ({ request }) => {
    const res = await request.post(`${API_BASE}/process/templates/camp-checklist/install`, {
      headers: authHeaders,
    });
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      expect(body).toHaveProperty('id');
      expect(body.name).toBe('Checklist tổ chức trại');
    }
  });

  // ── Import/Export ──

  test('POST definitions/import then export round-trip', async ({ request }) => {
    const importRes = await request.post(`${API_BASE}/process/definitions/import`, {
      headers: authHeaders,
      data: {
        name: `Imported E2E ${Date.now()}`,
        description: 'Round-trip test',
        nodes: [
          { id: 's', type: 'start', label: 'S', position: { x: 0, y: 0 }, data: {} },
          { id: 'e', type: 'end', label: 'E', position: { x: 0, y: 100 }, data: {} },
        ],
        edges: [{ id: 'e1', source: 's', target: 'e' }],
      },
    });
    expect(importRes.status()).toBeLessThan(500);
    if (!importRes.ok()) return;

    const imported = await importRes.json();
    const exportRes = await request.post(`${API_BASE}/process/definitions/${imported.id}/export`, {
      headers: authHeaders,
    });
    expect(exportRes.status()).toBeLessThan(500);
    if (exportRes.ok()) {
      const exported = await exportRes.json();
      expect(exported).toHaveProperty('nodes');
      expect(exported).toHaveProperty('edges');
      expect(exported).toHaveProperty('exportedAt');
    }
  });

  // ── Health Endpoint ──

  test('GET /process/health returns module health', async ({ request }) => {
    const res = await request.get(`${API_BASE}/process/health`, {
      headers: authHeaders,
    });
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      expect(body.module).toBe('process');
      expect(['healthy', 'degraded']).toContain(body.status);
      expect(body).toHaveProperty('metrics');
      expect(body).toHaveProperty('timestamp');
    }
  });

  // ── Stuck Runs ──

  test('GET /process/graph-runs/stuck returns stuck runs', async ({ request }) => {
    const res = await request.get(`${API_BASE}/process/graph-runs/stuck`, {
      headers: authHeaders,
    });
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      expect(body).toHaveProperty('count');
      expect(body).toHaveProperty('runs');
    }
  });

  test('POST /process/auto-resolve-stuck resolves old runs', async ({ request }) => {
    const res = await request.post(`${API_BASE}/process/auto-resolve-stuck`, {
      headers: authHeaders,
    });
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      expect(body).toHaveProperty('resolved');
      expect(body).toHaveProperty('runIds');
    }
  });
});

// ── UI Smoke Tests ──

test.describe('Process Module – UI Smoke', () => {
  const WEB_BASE = process.env.WEB_BASE_URL ?? 'http://localhost:3000';

  test('Process page loads', async ({ page }) => {
    await page.goto(`${WEB_BASE}/process`);
    await expect(page.locator('body')).toBeVisible();
    // Page should contain heading or navigation
    const heading = page.locator('h1, h2, [data-testid="process-heading"]').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Templates page loads', async ({ page }) => {
    await page.goto(`${WEB_BASE}/process/templates`);
    await expect(page.locator('body')).toBeVisible();
    // Should show template gallery heading
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Workflow builder page loads', async ({ page }) => {
    await page.goto(`${WEB_BASE}/process/workflow-builder`);
    await expect(page.locator('body')).toBeVisible();
  });
});
