import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const WEB_BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const ORG_ID = '24000000-0000-0000-0000-000000000001';
const BRANCH_ID = '24000000-0000-0000-0000-000000000002';
const UNIT_ID = '24000000-0000-0000-0000-000000000003';
const ADMIN_USER_ID = '24000000-0000-0000-0000-000000000011';
const ADMIN_MEMBER_ID = '24000000-0000-0000-0000-000000000012';
const PARENT_USER_ID = '24000000-0000-0000-0000-000000000021';
const PARENT_MEMBER_ID = '24000000-0000-0000-0000-000000000022';
const CHILD_USER_ID = '24000000-0000-0000-0000-000000000031';
const CHILD_MEMBER_ID = '24000000-0000-0000-0000-000000000032';
const SESSION_ID = '24000000-0000-0000-0000-000000000041';
const TICKET_ID = '24000000-0000-0000-0000-000000000051';
const QUIZ_ID = '24000000-0000-0000-0000-000000000061';
const QUESTION_ID = '24000000-0000-0000-0000-000000000062';
const BATTLE_ID = '24000000-0000-0000-0000-000000000063';
const RELEASE_REPORT_ID = '24000000-0000-0000-0000-000000000071';
const BATTLE_CODE = 'P1LIVE';
const ADMIN_EMAIL = 'p0p1-browser-admin@ttndd.test';
const PARENT_EMAIL = 'p0p1-browser-parent@ttndd.test';

test.describe.configure({ mode: 'serial' });

test.describe('P0/P1 browser live routes', () => {
  const prisma = new PrismaClient();

  test.beforeAll(async () => {
    await seedBrowserLiveFixture(prisma);
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('redirects protected pages without token and keeps dashboard/HUD/session/release/approval/consent on live APIs', async ({
    page,
    request,
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);

    const admin = await loginViaApi(request, ADMIN_EMAIL);
    await installToken(page, admin.token);

    const seenApiUrls: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/')) seenApiUrls.push(req.url());
    });

    const dashboardResponses = [
      page.waitForResponse((res) => res.url().includes('/api/v1/auth/me') && res.ok()),
      page.waitForResponse((res) => res.url().includes('/api/v1/dashboards/org') && res.ok()),
      page.waitForResponse((res) => res.url().includes('/api/v1/dashboards/spices') && res.ok()),
      page.waitForResponse((res) => res.url().includes('/api/v1/dashboards/my') && res.ok()),
      page.waitForResponse((res) => res.url().includes('/api/v1/rewards/exp/summary/') && res.ok()),
      page.waitForResponse((res) => res.url().includes('/api/v1/scout/dashboard/') && res.ok()),
    ];
    await page.goto('/dashboard');
    await Promise.all(dashboardResponses);
    await expect(page.getByRole('heading', { name: /Tong quan/i })).toBeVisible();
    await expect(page.getByText(ADMIN_EMAIL).first()).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: /Tong quan/i })).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);

    const sessionsResponses = [
      page.waitForResponse((res) => res.url().includes('/api/v1/sessions?limit=50') && res.ok()),
      page.waitForResponse(
        (res) => res.url().includes(`/api/v1/organizations/${ORG_ID}/branches`) && res.ok(),
      ),
    ];
    await page.goto('/sessions');
    await Promise.all(sessionsResponses);
    await expect(page.getByRole('heading', { name: /Sinh hoat/i })).toBeVisible();
    await expect(page.getByText('P0P1 Live Session')).toBeVisible();

    const attendanceResponse = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/v1/sessions/${SESSION_ID}/attendance`) &&
        res.request().method() === 'POST' &&
        res.ok(),
    );
    await page.getByRole('button', { name: 'Present' }).first().click();
    await attendanceResponse;

    await page.goto('/settings/release');
    await page.waitForResponse(
      (res) => res.url().includes('/api/v1/system/release-gates/latest') && res.ok(),
    );
    await expect(page.getByRole('heading', { name: /Release Dashboard/i })).toBeVisible();
    await expect(page.getByText('Profile P0_P1_BROWSER_LIVE')).toBeVisible();

    await page.goto('/approvals');
    await page.waitForResponse(
      (res) => res.url().includes('/api/v1/tickets?limit=100') && res.ok(),
    );
    await expect(page.getByRole('heading', { name: /Phe duyet/i })).toBeVisible();
    await expect(page.getByText('P0P1 Browser Approval')).toBeVisible();

    const approvalResponse = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/v1/tickets/${TICKET_ID}/approve`) &&
        res.request().method() === 'POST' &&
        res.ok(),
    );
    await page.getByRole('button', { name: 'Phe duyet' }).last().click();
    await approvalResponse;
    await expect(page.getByText('Da duyet')).toBeVisible();

    await page.goto('/consent-templates');
    await page.waitForResponse(
      (res) => res.url().includes('/api/v1/tickets/consent-templates') && res.ok(),
    );
    await expect(page.getByRole('heading', { name: /Mau dong y/i })).toBeVisible();
    await expect(page.getByText('Active').first()).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept('Browser Parent'));
    const consentResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/api/v1/tickets/consent/') &&
        res.request().method() === 'POST' &&
        res.ok(),
    );
    await page.getByRole('button', { name: 'Tao ticket' }).first().click();
    await consentResponse;

    expect(seenApiUrls.some((url) => url.includes('/approvals/requests'))).toBe(false);
    expect(seenApiUrls.some((url) => url.includes('/api/v1/consent-templates'))).toBe(false);
  });

  test('loads parent portal from linked-child dashboard only', async ({ page, request }) => {
    const parent = await loginViaApi(request, PARENT_EMAIL);
    await installToken(page, parent.token);

    await page.goto('/parent-portal');
    await page.waitForResponse(
      (res) => res.url().includes('/api/v1/hrm/parent-portal/dashboard') && res.ok(),
    );
    await expect(page.getByRole('heading', { name: /Cong Phu huynh/i })).toBeVisible();
    await expect(page.getByText('P0P1 Child Member')).toBeVisible();
    await expect(page.getByText('Dat tuan thu')).toBeVisible();
  });

  test('connects battle page through Socket.IO auth without query identity', async ({
    page,
    request,
  }) => {
    const admin = await loginViaApi(request, ADMIN_EMAIL);
    await installToken(page, admin.token);

    const websocketUrls: string[] = [];
    page.on('websocket', (socket) => websocketUrls.push(socket.url()));

    await page.goto(`/lms/battle/${BATTLE_CODE}`);
    await page.waitForResponse(
      (res) => res.url().includes(`/api/v1/lms/battles/${BATTLE_CODE}`) && res.ok(),
    );
    await expect(page.getByText('Realtime connected')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('main').getByText(BATTLE_CODE)).toBeVisible();

    expect(websocketUrls.length).toBeGreaterThan(0);
    expect(websocketUrls.every((url) => !url.includes('orgId=') && !url.includes('userId='))).toBe(
      true,
    );
  });
});

async function loginViaApi(request: APIRequestContext, email: string) {
  const response = await request.post(`${API_BASE}/api/v1/auth/login`, {
    data: { email, password: 'browser-live' },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { data: { token: string; user: unknown } };
  return body.data;
}

async function installToken(page: Page, token: string) {
  await page.context().addCookies([{ name: 'token', value: token, url: WEB_BASE }]);
  await page.addInitScript((value) => {
    window.localStorage.setItem('token', value);
  }, token);
}

async function seedBrowserLiveFixture(prisma: PrismaClient) {
  const today = new Date('2026-05-16T00:00:00.000Z');
  const childBirthDate = new Date('2013-02-01T00:00:00.000Z');

  await prisma.sessionAttendance.deleteMany({ where: { sessionId: SESSION_ID } });

  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { slug: 'p0p1-browser-live', name: 'P0P1 Browser Live Org', isActive: true },
    create: {
      id: ORG_ID,
      slug: 'p0p1-browser-live',
      name: 'P0P1 Browser Live Org',
      fullName: 'P0/P1 Browser Live Smoke Organization',
      settings: {},
    },
  });

  await prisma.branch.upsert({
    where: { id: BRANCH_ID },
    update: { code: 'thieu', name: 'Thieu Browser Live' },
    create: {
      id: BRANCH_ID,
      orgId: ORG_ID,
      code: 'thieu',
      name: 'Thieu Browser Live',
      minAge: 12,
      maxAge: 15,
      settings: {},
    },
  });

  await prisma.unit.upsert({
    where: { id: UNIT_ID },
    update: { name: 'Browser Live Unit' },
    create: {
      id: UNIT_ID,
      orgId: ORG_ID,
      branchId: BRANCH_ID,
      name: 'Browser Live Unit',
      unitType: 'patrol',
    },
  });

  await upsertUser(prisma, ADMIN_USER_ID, 'p0p1-browser-admin', ADMIN_EMAIL, 'P0P1 Admin');
  await upsertUser(prisma, PARENT_USER_ID, 'p0p1-browser-parent', PARENT_EMAIL, 'P0P1 Parent');
  await upsertUser(
    prisma,
    CHILD_USER_ID,
    'p0p1-browser-child',
    'p0p1-browser-child@ttndd.test',
    'P0P1 Child',
  );

  await upsertMember(prisma, ADMIN_MEMBER_ID, ADMIN_USER_ID, 'admin', 'AD-BROWSER', 'P0P1 Admin');
  await upsertMember(
    prisma,
    PARENT_MEMBER_ID,
    PARENT_USER_ID,
    'parent',
    'PA-BROWSER',
    'P0P1 Parent',
  );
  await upsertMember(
    prisma,
    CHILD_MEMBER_ID,
    CHILD_USER_ID,
    'member',
    'CH-BROWSER',
    'P0P1 Child',
    PARENT_MEMBER_ID,
  );

  await upsertProfile(
    prisma,
    ADMIN_MEMBER_ID,
    'P0P1 Admin Member',
    new Date('1990-01-01T00:00:00.000Z'),
  );
  await upsertProfile(
    prisma,
    PARENT_MEMBER_ID,
    'P0P1 Parent Member',
    new Date('1985-01-01T00:00:00.000Z'),
  );
  await upsertProfile(prisma, CHILD_MEMBER_ID, 'P0P1 Child Member', childBirthDate);

  await prisma.guardianLink.upsert({
    where: { id: '24000000-0000-0000-0000-000000000033' },
    update: {
      fullName: 'P0P1 Parent Member',
      relation: 'father',
      email: PARENT_EMAIL,
      isPrimary: true,
      consentSigned: true,
      consentDate: today,
    },
    create: {
      id: '24000000-0000-0000-0000-000000000033',
      orgId: ORG_ID,
      orgMemberId: CHILD_MEMBER_ID,
      fullName: 'P0P1 Parent Member',
      relation: 'father',
      email: PARENT_EMAIL,
      isPrimary: true,
      consentSigned: true,
      consentDate: today,
    },
  });

  await prisma.memberExpSummary.upsert({
    where: { orgMemberId: ADMIN_MEMBER_ID },
    update: { totalExp: 120, availableExp: 100 },
    create: { orgId: ORG_ID, orgMemberId: ADMIN_MEMBER_ID, totalExp: 120, availableExp: 100 },
  });

  await prisma.memberExpSummary.upsert({
    where: { orgMemberId: CHILD_MEMBER_ID },
    update: { totalExp: 75, availableExp: 75 },
    create: { orgId: ORG_ID, orgMemberId: CHILD_MEMBER_ID, totalExp: 75, availableExp: 75 },
  });

  await prisma.session.upsert({
    where: { id: SESSION_ID },
    update: {
      branchId: BRANCH_ID,
      title: 'P0P1 Live Session',
      sessionDate: today,
      status: 'published',
      spicesTags: ['social', 'intellectual'],
    },
    create: {
      id: SESSION_ID,
      orgId: ORG_ID,
      branchId: BRANCH_ID,
      title: 'P0P1 Live Session',
      sessionDate: today,
      startTime: '08:00',
      endTime: '10:00',
      location: 'Browser Smoke Hall',
      sessionType: 'weekly',
      status: 'published',
      spicesTags: ['social', 'intellectual'],
      createdBy: ADMIN_USER_ID,
      expReward: 5,
    },
  });

  await prisma.ticket.upsert({
    where: { id: TICKET_ID },
    update: {
      title: 'P0P1 Browser Approval',
      status: 'open',
      requesterId: ADMIN_USER_ID,
      customFields: approvalRequestFixture(),
    },
    create: {
      id: TICKET_ID,
      orgId: ORG_ID,
      ticketNumber: 'P0P1-BROWSER-001',
      title: 'P0P1 Browser Approval',
      description: 'Approval request for P0/P1 browser live smoke.',
      category: 'finance',
      priority: 'medium',
      status: 'open',
      requesterId: ADMIN_USER_ID,
      customFields: approvalRequestFixture(),
      tags: ['browser-live'],
    },
  });

  await prisma.releaseGateReport.upsert({
    where: { id: RELEASE_REPORT_ID },
    update: {
      environment: 'local-browser-live',
      buildId: 'p0-p1-browser-live',
      status: 'PASS',
      reportJson: { gate: 'browser-live', status: 'PASS' },
      linksJson: { receipt: 'receipts/sessions/2026-05-16-p0-p1-browser-live-smoke.jsonl' },
    },
    create: {
      id: RELEASE_REPORT_ID,
      environment: 'local-browser-live',
      buildId: 'p0-p1-browser-live',
      commitSha: 'local',
      profile: 'P0_P1_BROWSER_LIVE',
      status: 'PASS',
      reportJson: { gate: 'browser-live', status: 'PASS' },
      linksJson: { receipt: 'receipts/sessions/2026-05-16-p0-p1-browser-live-smoke.jsonl' },
    },
  });

  await prisma.quiz.upsert({
    where: { id: QUIZ_ID },
    update: { title: 'P1 Live Battle Quiz', passingScore: 70, expReward: 10 },
    create: {
      id: QUIZ_ID,
      orgId: ORG_ID,
      title: 'P1 Live Battle Quiz',
      quizType: 'battle',
      passingScore: 70,
      expReward: 10,
      createdBy: ADMIN_USER_ID,
    },
  });

  await prisma.quizQuestion.upsert({
    where: { id: QUESTION_ID },
    update: {
      questionText: 'Which route authenticates battle sockets?',
      options: {
        choices: [
          { key: 'A', label: 'handshake.auth.token' },
          { key: 'B', label: 'handshake.query.userId' },
        ],
        correctAnswer: 'A',
      },
      correctAnswer: 'A',
    },
    create: {
      id: QUESTION_ID,
      orgId: ORG_ID,
      quizId: QUIZ_ID,
      questionText: 'Which route authenticates battle sockets?',
      options: {
        choices: [
          { key: 'A', label: 'handshake.auth.token' },
          { key: 'B', label: 'handshake.query.userId' },
        ],
        correctAnswer: 'A',
      },
      correctAnswer: 'A',
      points: 10,
      orderIndex: 0,
    },
  });

  await prisma.quizBattle.upsert({
    where: { id: BATTLE_ID },
    update: {
      quizId: QUIZ_ID,
      hostId: ADMIN_USER_ID,
      gameCode: BATTLE_CODE,
      status: 'lobby',
      maxPlayers: 10,
      currentQuestion: 0,
      results: {},
    },
    create: {
      id: BATTLE_ID,
      orgId: ORG_ID,
      quizId: QUIZ_ID,
      hostId: ADMIN_USER_ID,
      gameCode: BATTLE_CODE,
      status: 'lobby',
      maxPlayers: 10,
      currentQuestion: 0,
      results: {},
    },
  });
}

async function upsertUser(
  prisma: PrismaClient,
  id: string,
  firebaseUid: string,
  email: string,
  displayName: string,
) {
  await prisma.user.upsert({
    where: { id },
    update: { firebaseUid, email, displayName, isActive: true },
    create: { id, firebaseUid, email, displayName, isActive: true },
  });
}

async function upsertMember(
  prisma: PrismaClient,
  id: string,
  userId: string,
  role: string,
  memberCode: string,
  scoutName: string,
  linkedMemberId?: string,
) {
  await prisma.orgMember.upsert({
    where: { id },
    update: {
      userId,
      role,
      branchId: BRANCH_ID,
      unitId: UNIT_ID,
      memberCode,
      scoutName,
      linkedMemberId,
      status: 'active',
    },
    create: {
      id,
      orgId: ORG_ID,
      userId,
      role,
      branchId: BRANCH_ID,
      unitId: UNIT_ID,
      memberCode,
      scoutName,
      linkedMemberId,
      status: 'active',
    },
  });
}

async function upsertProfile(
  prisma: PrismaClient,
  orgMemberId: string,
  fullName: string,
  birthDate: Date,
) {
  await prisma.memberProfile.upsert({
    where: { orgMemberId },
    update: {
      fullName,
      birthDate,
      emergencyContact: '0900000000',
      medicalFormDate: new Date('2026-01-01T00:00:00.000Z'),
    },
    create: {
      orgId: ORG_ID,
      orgMemberId,
      fullName,
      birthDate,
      emergencyContact: '0900000000',
      medicalFormDate: new Date('2026-01-01T00:00:00.000Z'),
    },
  });
}

function approvalRequestFixture() {
  return {
    approvalRequest: {
      type: 'budget',
      amount: 1200000,
      notes: 'Browser-live approval should be routed through tickets.',
      status: 'pending',
      requestedBy: ADMIN_USER_ID,
      requestedAt: '2026-05-16T00:00:00.000Z',
    },
  };
}
