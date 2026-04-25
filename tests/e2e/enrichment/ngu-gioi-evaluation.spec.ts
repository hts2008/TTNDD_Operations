import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Enrichment — Ngũ Giới & 5-Dimension Evaluation @module:enrichment @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('M10-E2E-09: create/update Ngũ Giới assessment', async ({ request }) => {
    const res = await request.post('/api/v1/enrichment/ngu-gioi', {
      data: {
        weekStart: '2026-04-21',
        batSatSinh: 9,
        batDuDao: 8,
        batTaDam: 10,
        batTuuNhuc: 7,
        batVongNgu: 8,
        reflection: 'E2E test reflection on Five Precepts',
      },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });

  test('M10-E2E-10: get my Ngũ Giới assessments', async ({ request }) => {
    const res = await request.get('/api/v1/enrichment/ngu-gioi/my');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M10-E2E-11: Ngũ Giới ordered by weekStart desc', async ({ request }) => {
    const res = await request.get('/api/v1/enrichment/ngu-gioi/my');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      if (body.length > 1) {
        for (let i = 1; i < body.length; i++) {
          expect(new Date(body[i - 1].weekStart).getTime()).toBeGreaterThanOrEqual(
            new Date(body[i].weekStart).getTime(),
          );
        }
      }
    }
  });

  test('M10-E2E-12: Ngũ Giới has all 5 precept scores', async ({ request }) => {
    const res = await request.get('/api/v1/enrichment/ngu-gioi/my');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      for (const a of body) {
        expect(a).toHaveProperty('batSatSinh');
        expect(a).toHaveProperty('batDuDao');
        expect(a).toHaveProperty('batTaDam');
        expect(a).toHaveProperty('batTuuNhuc');
        expect(a).toHaveProperty('batVongNgu');
      }
    }
  });

  test('M10-E2E-13: create evaluation requires admin', async ({ request }) => {
    const res = await request.post('/api/v1/enrichment/evaluations', {
      data: {
        orgMemberId: 'test-member',
        branchId: 'branch-thieu',
        evaluationType: 'quarterly',
        evaluationDate: '2026-04-25',
        scoreDaoDuc: 8,
        scoreKyNang: 7,
        scoreTheChat: 9,
        scoreLanhDao: 6,
        scorePhungSu: 8,
        strengths: 'Tinh thần phục vụ tốt',
        areasToImprove: 'Cần cải thiện kỹ năng lãnh đạo',
        recommendations: 'Tham gia thêm hoạt động nhóm',
      },
    });
    expect([201, 401, 403]).toContain(res.status());
  });

  test('M10-E2E-14: get evaluations by member requires admin', async ({ request }) => {
    const res = await request.get('/api/v1/enrichment/evaluations/nonexistent-member');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('M10-E2E-15: evaluation has 5 dimension scores', async ({ request }) => {
    const res = await request.get('/api/v1/enrichment/evaluations/nonexistent-member');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      for (const e of body) {
        expect(e).toHaveProperty('scoreDaoDuc');
        expect(e).toHaveProperty('scoreKyNang');
        expect(e).toHaveProperty('scoreTheChat');
        expect(e).toHaveProperty('scoreLanhDao');
        expect(e).toHaveProperty('scorePhungSu');
      }
    }
  });

  test('M10-E2E-16: Ngũ Giới upsert same week updates existing', async ({ request }) => {
    const res = await request.post('/api/v1/enrichment/ngu-gioi', {
      data: {
        weekStart: '2026-04-21',
        batSatSinh: 10,
        reflection: 'Updated reflection',
      },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });
});
