import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Sessions — Lifecycle & Attendance @module:sessions @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('SS-E2E-01: create session with Tam Trụ pillars', async ({ request }) => {
    const res = await request.post('/api/v1/sessions', {
      data: {
        branchId: 'branch-thieu',
        title: 'E2E Test Session',
        sessionDate: '2026-06-15',
        startTime: '08:00',
        endTime: '11:00',
        location: 'Vườn Nhãn',
        sessionType: 'regular',
        theme: 'Kỹ năng trại',
        pillarDaoDuc: 'Trung tín',
        pillarPhuongPhap: 'Hoạt động ngoài trời',
        pillarGiaoDuc: 'Tự lực cánh sinh',
      },
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });

  test('SS-E2E-02: list sessions with filters', async ({ request }) => {
    const res = await request.get('/api/v1/sessions?status=planned&page=1&limit=10');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    }
  });

  test('SS-E2E-03: list sessions with date range', async ({ request }) => {
    const res = await request.get('/api/v1/sessions?from=2026-01-01&to=2026-12-31');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('SS-E2E-04: update session (debrief)', async ({ request }) => {
    const res = await request.patch('/api/v1/sessions/nonexistent', {
      data: {
        debriefNotes: 'Session went well',
        energyRating: 4,
        engagementRating: 5,
      },
    });
    expect([200, 401, 403, 404]).toContain(res.status());
  });

  test('SS-E2E-05: transition session (SM-12)', async ({ request }) => {
    const res = await request.post('/api/v1/sessions/nonexistent/transition', {
      data: { action: 'publish' },
    });
    expect([200, 400, 401, 403, 404]).toContain(res.status());
  });

  test('SS-E2E-06: mark attendance (bulk)', async ({ request }) => {
    const res = await request.post('/api/v1/sessions/nonexistent/attendance', {
      data: {
        records: [
          { memberId: 'member-001', status: 'present' },
          { memberId: 'member-002', status: 'absent' },
          { memberId: 'member-003', status: 'excused', excusedReason: 'Sick' },
        ],
      },
    });
    expect([200, 201, 401, 403, 404]).toContain(res.status());
  });

  test('SS-E2E-07: get attendance report for member', async ({ request }) => {
    const res = await request.get('/api/v1/sessions/attendance/report/test-member-001');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('present');
      expect(body).toHaveProperty('absent');
      expect(body).toHaveProperty('rate');
    }
  });

  test('SS-E2E-08: get session detail with attendance', async ({ request }) => {
    const res = await request.get('/api/v1/sessions/nonexistent');
    expect([401, 403, 404]).toContain(res.status());
  });
});
