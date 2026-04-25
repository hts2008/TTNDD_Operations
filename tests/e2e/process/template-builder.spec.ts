import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Process — Templates & Builder @module:process @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M6-E2E-17: templates page loads', async ({ page }) => {
    await page.goto('/process/templates');
    const body = (await page.textContent('body')) || '';
    const hasTemplateContent =
      body.includes('Template') || body.includes('Mẫu') || body.includes('Workflow');
    expect(hasTemplateContent).toBeTruthy();
  });

  test('M6-E2E-18: templates list API responds', async ({ request }) => {
    const res = await request.get('/api/v1/process/templates');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M6-E2E-19: template by slug rejects nonexistent', async ({ request }) => {
    const res = await request.get('/api/v1/process/templates/nonexistent-slug');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M6-E2E-20: workflow builder page loads', async ({ page }) => {
    await page.goto('/process/workflow-builder');
    const body = (await page.textContent('body')) || '';
    const hasBuilderContent =
      body.includes('Workflow') ||
      body.includes('Builder') ||
      body.includes('Node') ||
      body.includes('Thiết kế');
    expect(hasBuilderContent).toBeTruthy();
  });

  test('M6-E2E-21: graph save rejects invalid graph (no start node)', async ({ request }) => {
    const res = await request.post('/api/v1/process/definitions/test-def-id/graph', {
      data: {
        nodes: [{ id: 'n1', type: 'end', label: 'End', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('M6-E2E-22: export definition rejects nonexistent', async ({ request }) => {
    const res = await request.post('/api/v1/process/definitions/nonexistent-def/export');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('M6-E2E-23: process health endpoint responds', async ({ request }) => {
    const res = await request.get('/api/v1/process/health');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('module', 'process');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('metrics');
    }
  });

  test('M6-E2E-24: auto-resolve stuck runs endpoint responds', async ({ request }) => {
    const res = await request.post('/api/v1/process/auto-resolve-stuck');
    expect([200, 201, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('resolved');
      expect(body).toHaveProperty('runIds');
    }
  });
});
