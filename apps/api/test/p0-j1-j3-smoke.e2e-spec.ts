import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';

const ORG_ID = '10000000-0000-4000-8000-000000000011';
const BRANCH_ID = '10000000-0000-4000-8000-000000000012';
const UNIT_ID = '10000000-0000-4000-8000-000000000013';
const SESSION_ID = '10000000-0000-4000-8000-000000000014';

const ADMIN_USER_ID = '10000000-0000-4000-8000-000000000021';
const ADMIN_MEMBER_ID = '10000000-0000-4000-8000-000000000022';
const ADMIN_EMAIL = 'p0.admin@pilot.ttndd.test';
const ADMIN_FIREBASE_UID = 'p0-admin-pilot';

const PARENT_USER_ID = '10000000-0000-4000-8000-000000000031';
const PARENT_MEMBER_ID = '10000000-0000-4000-8000-000000000032';
const PARENT_EMAIL = 'p0.parent@pilot.ttndd.test';
const PARENT_FIREBASE_UID = 'p0-parent-pilot';

const UNLINKED_PARENT_USER_ID = '10000000-0000-4000-8000-000000000041';
const UNLINKED_PARENT_MEMBER_ID = '10000000-0000-4000-8000-000000000042';
const UNLINKED_PARENT_EMAIL = 'p0.unlinked-parent@pilot.ttndd.test';
const UNLINKED_PARENT_FIREBASE_UID = 'p0-unlinked-parent-pilot';

const CHILD_USER_ID = '10000000-0000-4000-8000-000000000051';
const CHILD_MEMBER_ID = '10000000-0000-4000-8000-000000000052';
const CHILD_EMAIL = 'p0.child@pilot.ttndd.test';
const CHILD_FIREBASE_UID = 'p0-child-pilot';

const UNLINKED_CHILD_USER_ID = '10000000-0000-4000-8000-000000000061';
const UNLINKED_CHILD_MEMBER_ID = '10000000-0000-4000-8000-000000000062';
const UNLINKED_CHILD_EMAIL = 'p0.unlinked-child@pilot.ttndd.test';
const UNLINKED_CHILD_FIREBASE_UID = 'p0-unlinked-child-pilot';

type LoginResponse = {
  user: {
    userId: string;
    orgId: string;
    role: string;
    email: string;
    memberId: string;
    firebaseUid: string;
  };
  token: string;
};

function dataOf<T>(body: { data: T }) {
  return body.data;
}

describe('P0 J1-J3 pilot smoke (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.APP_ENV = 'development';
    process.env.GOOGLE_CLOUD_PROJECT = '';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await seedPilotFixture(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(email: string): Promise<LoginResponse> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'dev-password-not-used' })
      .expect(201);

    const payload = dataOf<LoginResponse>(res.body);
    expect(payload.token).toMatch(/^dev:/);
    expect(payload.user.email).toBe(email);
    return payload;
  }

  it('J1: admin can log in, hydrate /auth/me, and load org dashboard data', async () => {
    const loginPayload = await login(ADMIN_EMAIL);
    expect(loginPayload.token).toBe(`dev:${ADMIN_FIREBASE_UID}`);
    expect(loginPayload.user).toMatchObject({
      userId: ADMIN_USER_ID,
      orgId: ORG_ID,
      role: 'admin',
      memberId: ADMIN_MEMBER_ID,
    });

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginPayload.token}`)
      .expect(200);

    expect(dataOf<{ user: LoginResponse['user'] }>(me.body).user).toMatchObject({
      orgId: ORG_ID,
      memberId: ADMIN_MEMBER_ID,
      email: ADMIN_EMAIL,
    });

    const dashboard = await request(app.getHttpServer())
      .get('/api/v1/dashboards/org')
      .set('Authorization', `Bearer ${loginPayload.token}`)
      .expect(200);

    const body = dataOf<{ widgets: Array<{ label: string; value: number | string }> }>(
      dashboard.body,
    );
    const totalMembers = body.widgets.find((widget) => widget.label === 'Total Members');
    expect(totalMembers).toBeDefined();
    expect(Number(totalMembers!.value)).toBeGreaterThanOrEqual(4);
  });

  it('J2: parent portal returns only linked children and denies unrelated parent data', async () => {
    const parent = await login(PARENT_EMAIL);

    const linkedDashboard = await request(app.getHttpServer())
      .get('/api/v1/hrm/parent-portal/dashboard')
      .set('Authorization', `Bearer ${parent.token}`)
      .expect(200);

    const linkedData = dataOf<{
      children: Array<{
        id: string;
        memberCode: string | null;
        profile: { fullName: string } | null;
      }>;
      accessLogs: Array<{ action: string; resource: string; timestamp: string }>;
    }>(linkedDashboard.body);

    expect(linkedData.children.map((child) => child.id)).toEqual([CHILD_MEMBER_ID]);
    expect(linkedData.children[0]).toMatchObject({
      id: CHILD_MEMBER_ID,
      memberCode: 'P0-CHILD-001',
      profile: { fullName: 'P0 Linked Child' },
    });
    expect(linkedData.children.map((child) => child.id)).not.toContain(UNLINKED_CHILD_MEMBER_ID);
    expect(Array.isArray(linkedData.accessLogs)).toBe(true);

    const unrelatedParent = await login(UNLINKED_PARENT_EMAIL);
    const unrelatedDashboard = await request(app.getHttpServer())
      .get('/api/v1/hrm/parent-portal/dashboard')
      .set('Authorization', `Bearer ${unrelatedParent.token}`)
      .expect(200);

    expect(dataOf<{ children: unknown[] }>(unrelatedDashboard.body).children).toEqual([]);
  });

  it('J3: marking session attendance persists attendance and produces an EXP reward trace', async () => {
    const admin = await login(ADMIN_EMAIL);

    await prisma.expTransaction.deleteMany({
      where: {
        orgId: ORG_ID,
        orgMemberId: CHILD_MEMBER_ID,
        eventType: 'session.attendance_marked',
        sourceEntityId: SESSION_ID,
      },
    });
    await prisma.memberExpSummary.upsert({
      where: { orgMemberId: CHILD_MEMBER_ID },
      update: { totalExp: 0, availableExp: 0 },
      create: { orgId: ORG_ID, orgMemberId: CHILD_MEMBER_ID, totalExp: 0, availableExp: 0 },
    });

    const before = await getExpSummary(admin.token, CHILD_MEMBER_ID);

    const attendance = await request(app.getHttpServer())
      .post(`/api/v1/sessions/${SESSION_ID}/attendance`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ records: [{ memberId: CHILD_MEMBER_ID, status: 'present' }] })
      .expect(201);

    expect(dataOf<{ marked: number }>(attendance.body)).toEqual({ marked: 1 });

    const report = await request(app.getHttpServer())
      .get(`/api/v1/sessions/attendance/report/${CHILD_MEMBER_ID}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(dataOf<{ present: number; total: number }>(report.body)).toMatchObject({
      total: expect.any(Number),
      present: expect.any(Number),
    });
    expect(dataOf<{ present: number }>(report.body).present).toBeGreaterThanOrEqual(1);

    const awarded = await waitForExpAward(admin.token, CHILD_MEMBER_ID, before.totalExp + 5);
    expect(awarded.totalExp).toBeGreaterThanOrEqual(before.totalExp + 5);

    const transactions = await request(app.getHttpServer())
      .get(`/api/v1/rewards/exp/transactions/${CHILD_MEMBER_ID}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const txRows = dataOf<Array<{ eventType: string; sourceEntityId: string; expAmount: number }>>(
      transactions.body,
    );
    expect(txRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'session.attendance_marked',
          sourceEntityId: SESSION_ID,
          expAmount: 5,
        }),
      ]),
    );
  });

  async function getExpSummary(token: string, memberId: string) {
    const summary = await request(app.getHttpServer())
      .get(`/api/v1/rewards/exp/summary/${memberId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return dataOf<{ totalExp: number; availableExp: number }>(summary.body);
  }

  async function waitForExpAward(token: string, memberId: string, minTotalExp: number) {
    let latest = await getExpSummary(token, memberId);
    for (let attempt = 0; attempt < 20 && latest.totalExp < minTotalExp; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      latest = await getExpSummary(token, memberId);
    }
    return latest;
  }
});

async function seedPilotFixture(prisma: PrismaService) {
  await prisma.organization.upsert({
    where: { slug: 'ttndd-p0-pilot' },
    update: { name: 'TTNDD P0 Pilot Org', isActive: true },
    create: {
      id: ORG_ID,
      slug: 'ttndd-p0-pilot',
      name: 'TTNDD P0 Pilot Org',
      fullName: 'TTNDD P0 Pilot Organization',
      subscriptionPlan: 'basic',
      isActive: true,
      settings: { enabledModules: ['HRM', 'SESSIONS', 'REWARDS', 'DASHBOARDS'] },
    },
  });

  await prisma.branch.upsert({
    where: { orgId_code: { orgId: ORG_ID, code: 'P0' } },
    update: { name: 'P0 Pilot Branch' },
    create: {
      id: BRANCH_ID,
      orgId: ORG_ID,
      code: 'P0',
      name: 'P0 Pilot Branch',
      minAge: 6,
      maxAge: 18,
      colorTheme: '#2563eb',
      narrativeName: 'Pilot',
    },
  });

  await prisma.unit.upsert({
    where: { id: UNIT_ID },
    update: { name: 'P0 Pilot Unit' },
    create: {
      id: UNIT_ID,
      orgId: ORG_ID,
      branchId: BRANCH_ID,
      name: 'P0 Pilot Unit',
      unitType: 'patrol',
    },
  });

  await seedUser(prisma, ADMIN_USER_ID, ADMIN_FIREBASE_UID, ADMIN_EMAIL, 'P0 Admin');
  await seedUser(prisma, PARENT_USER_ID, PARENT_FIREBASE_UID, PARENT_EMAIL, 'P0 Parent');
  await seedUser(
    prisma,
    UNLINKED_PARENT_USER_ID,
    UNLINKED_PARENT_FIREBASE_UID,
    UNLINKED_PARENT_EMAIL,
    'P0 Unlinked Parent',
  );
  await seedUser(prisma, CHILD_USER_ID, CHILD_FIREBASE_UID, CHILD_EMAIL, 'P0 Linked Child');
  await seedUser(
    prisma,
    UNLINKED_CHILD_USER_ID,
    UNLINKED_CHILD_FIREBASE_UID,
    UNLINKED_CHILD_EMAIL,
    'P0 Unlinked Child',
  );

  await seedMember(prisma, ADMIN_MEMBER_ID, ADMIN_USER_ID, 'admin', 'P0-ADMIN-001');
  await seedMember(prisma, PARENT_MEMBER_ID, PARENT_USER_ID, 'parent', 'P0-PARENT-001');
  await seedMember(
    prisma,
    UNLINKED_PARENT_MEMBER_ID,
    UNLINKED_PARENT_USER_ID,
    'parent',
    'P0-PARENT-002',
  );
  await seedMember(
    prisma,
    CHILD_MEMBER_ID,
    CHILD_USER_ID,
    'user',
    'P0-CHILD-001',
    PARENT_MEMBER_ID,
  );
  await seedMember(
    prisma,
    UNLINKED_CHILD_MEMBER_ID,
    UNLINKED_CHILD_USER_ID,
    'user',
    'P0-CHILD-002',
  );

  await prisma.memberProfile.upsert({
    where: { orgMemberId: CHILD_MEMBER_ID },
    update: { fullName: 'P0 Linked Child', consentFormSigned: true },
    create: {
      orgId: ORG_ID,
      orgMemberId: CHILD_MEMBER_ID,
      fullName: 'P0 Linked Child',
      birthDate: new Date('2015-05-01'),
      consentFormSigned: true,
      createdBy: ADMIN_USER_ID,
    },
  });
  await prisma.memberProfile.upsert({
    where: { orgMemberId: UNLINKED_CHILD_MEMBER_ID },
    update: { fullName: 'P0 Unlinked Child' },
    create: {
      orgId: ORG_ID,
      orgMemberId: UNLINKED_CHILD_MEMBER_ID,
      fullName: 'P0 Unlinked Child',
      birthDate: new Date('2015-08-01'),
      createdBy: ADMIN_USER_ID,
    },
  });

  await prisma.guardianLink.upsert({
    where: {
      orgMemberId_fullName_relation: {
        orgMemberId: CHILD_MEMBER_ID,
        fullName: 'P0 Parent',
        relation: 'parent',
      },
    },
    update: { email: PARENT_EMAIL, phone: '0900000011', isPrimary: true, consentSigned: true },
    create: {
      orgId: ORG_ID,
      orgMemberId: CHILD_MEMBER_ID,
      fullName: 'P0 Parent',
      relation: 'parent',
      email: PARENT_EMAIL,
      phone: '0900000011',
      isPrimary: true,
      consentSigned: true,
      consentDate: new Date('2026-05-15'),
    },
  });

  await prisma.memberExpSummary.upsert({
    where: { orgMemberId: CHILD_MEMBER_ID },
    update: {},
    create: { orgId: ORG_ID, orgMemberId: CHILD_MEMBER_ID },
  });

  await prisma.session.upsert({
    where: { id: SESSION_ID },
    update: {
      title: 'P0 J3 Attendance Smoke',
      status: 'planned',
      sessionDate: new Date('2026-05-15'),
    },
    create: {
      id: SESSION_ID,
      orgId: ORG_ID,
      branchId: BRANCH_ID,
      title: 'P0 J3 Attendance Smoke',
      sessionDate: new Date('2026-05-15'),
      startTime: '08:00',
      endTime: '10:00',
      location: 'Pilot Room',
      sessionType: 'regular',
      theme: 'P0 smoke',
      status: 'planned',
      spicesTags: ['SOCIAL'],
      createdBy: ADMIN_USER_ID,
      expReward: 5,
    },
  });
}

async function seedUser(
  prisma: PrismaService,
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

async function seedMember(
  prisma: PrismaService,
  id: string,
  userId: string,
  role: string,
  memberCode: string,
  linkedMemberId?: string,
) {
  await prisma.orgMember.upsert({
    where: { id },
    update: {
      userId,
      role,
      branchId: BRANCH_ID,
      unitId: role === 'user' ? UNIT_ID : undefined,
      memberCode,
      linkedMemberId,
      status: 'active',
    },
    create: {
      id,
      orgId: ORG_ID,
      userId,
      role,
      branchId: BRANCH_ID,
      unitId: role === 'user' ? UNIT_ID : undefined,
      memberCode,
      linkedMemberId,
      status: 'active',
      joinedDate: new Date('2026-01-01'),
    },
  });
}
