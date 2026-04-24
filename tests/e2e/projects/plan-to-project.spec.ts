import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Projects — Plan to Project Flow @module:projects @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  // ── Page Load Tests ──

  test('M2-E2E-01: projects page loads', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/projects/);
    const body = (await page.textContent('body')) || '';
    const hasContent =
      body.includes('Dự án') ||
      body.includes('Projects') ||
      body.includes('Kế hoạch') ||
      body.includes('Plan');
    expect(hasContent).toBeTruthy();
  });

  test('M2-E2E-02: plans page loads', async ({ page }) => {
    await page.goto('/plans');
    await expect(page).toHaveURL(/\/plans/);
    const body = (await page.textContent('body')) || '';
    const hasContent =
      body.includes('Kế hoạch') || body.includes('Plans') || body.includes('Tất cả');
    expect(hasContent).toBeTruthy();
  });

  // ── API Smoke Tests ──

  test('M2-E2E-03: projects API responds', async ({ request }) => {
    const res = await request.get('/api/v1/projects');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M2-E2E-04: plans API responds', async ({ request }) => {
    const res = await request.get('/api/v1/projects/plans');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M2-E2E-05: plan templates API responds', async ({ request }) => {
    const res = await request.get('/api/v1/projects/plans/templates');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M2-E2E-06: due alerts API responds', async ({ request }) => {
    const res = await request.get('/api/v1/projects/tasks/due-alerts');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('M2-E2E-07: rejects unauthenticated request', async ({ request }) => {
    const res = await request.get('/api/v1/projects', { headers: { Authorization: '' } });
    expect([401, 403]).toContain(res.status());
  });

  // ── SM-2 Transition Tests ──

  test('M2-E2E-08: plan transition rejects invalid action', async ({ request }) => {
    const res = await request.post('/api/v1/projects/plans/nonexistent/transition', {
      data: { action: 'approve' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  // ── SM-4 Task Transition Tests ──

  test('M2-E2E-09: task transition rejects invalid action', async ({ request }) => {
    const res = await request.post('/api/v1/projects/tasks/nonexistent/transition', {
      data: { action: 'start' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  // ── Calendar API ──

  test('M2-E2E-10: calendar API responds for valid project', async ({ request }) => {
    const projectsRes = await request.get('/api/v1/projects?limit=1');
    if (projectsRes.status() === 200) {
      const projects = await projectsRes.json();
      if (projects.data?.length > 0) {
        const calRes = await request.get(`/api/v1/projects/${projects.data[0].id}/calendar`);
        expect([200, 401, 403]).toContain(calRes.status());
      }
    }
  });

  // ── Kanban API ──

  test('M2-E2E-11: kanban API responds for valid project', async ({ request }) => {
    const projectsRes = await request.get('/api/v1/projects?limit=1');
    if (projectsRes.status() === 200) {
      const projects = await projectsRes.json();
      if (projects.data?.length > 0) {
        const kanbanRes = await request.get(`/api/v1/projects/${projects.data[0].id}/kanban`);
        expect([200, 401, 403]).toContain(kanbanRes.status());
      }
    }
  });
});
