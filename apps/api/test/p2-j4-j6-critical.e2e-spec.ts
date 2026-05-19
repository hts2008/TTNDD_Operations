import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';

const ORG_ID = '20000000-0000-4000-8000-000000000001';
const BRANCH_ID = '20000000-0000-4000-8000-000000000002';
const UNIT_ID = '20000000-0000-4000-8000-000000000003';

const ADMIN_USER_ID = '20000000-0000-4000-8000-000000000011';
const ADMIN_MEMBER_ID = '20000000-0000-4000-8000-000000000012';
const ADMIN_EMAIL = 'p2.j456.admin@pilot.ttndd.test';
const ADMIN_FIREBASE_UID = 'p2-j456-admin';

const PARENT_USER_ID = '20000000-0000-4000-8000-000000000021';
const PARENT_MEMBER_ID = '20000000-0000-4000-8000-000000000022';
const PARENT_EMAIL = 'p2.j456.parent@pilot.ttndd.test';
const PARENT_FIREBASE_UID = 'p2-j456-parent';

const CHILD_USER_ID = '20000000-0000-4000-8000-000000000031';
const CHILD_MEMBER_ID = '20000000-0000-4000-8000-000000000032';
const CHILD_EMAIL = 'p2.j456.child@pilot.ttndd.test';
const CHILD_FIREBASE_UID = 'p2-j456-child';

const RANK_ID = '20000000-0000-4000-8000-000000000041';
const SKILL_GROUP_ID = '20000000-0000-4000-8000-000000000042';
const SKILL_ID = '20000000-0000-4000-8000-000000000043';
const BADGE_ID = '20000000-0000-4000-8000-000000000044';

type Wrapped<T> = { data: T };

function dataOf<T>(body: Wrapped<T>) {
  return body.data;
}

describe('P2 J4-J6 critical workflows (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminToken = `dev:${ADMIN_FIREBASE_UID}`;
  const parentToken = `dev:${PARENT_FIREBASE_UID}`;
  const childToken = `dev:${CHILD_FIREBASE_UID}`;

  beforeAll(async () => {
    process.env.APP_ENV = 'development';
    process.env.GOOGLE_CLOUD_PROJECT = '';
    process.env.DATABASE_URL = 'postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops';
    process.env.DATABASE_MIGRATION_URL = 'postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops';

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
    await seedFixture(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanupFixture(prisma);
    if (app) await app.close();
  });

  it('J4: skill evidence review verifies skill, recomputes rank eligibility, and awards badge/EXP', async () => {
    const before = await getExpSummary(childToken, CHILD_MEMBER_ID);

    await request(app.getHttpServer())
      .post(`/api/v1/scout/member-ranks/${CHILD_MEMBER_ID}/start`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ branchId: BRANCH_ID, rankId: RANK_ID })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/scout/progress/${CHILD_MEMBER_ID}/start`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ skillId: SKILL_ID })
      .expect(201);

    const evidence = await request(app.getHttpServer())
      .post(`/api/v1/scout/evidence/${CHILD_MEMBER_ID}`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({
        skillId: SKILL_ID,
        level: 1,
        evidenceType: 'document',
        evidenceUrl: 'https://example.test/p2/j4-evidence.pdf',
        notes: 'P2 J4 evidence smoke',
      })
      .expect(201);

    const evidenceId = dataOf<{ id: string }>(evidence.body).id;

    await request(app.getHttpServer())
      .post(`/api/v1/scout/evidence/${evidenceId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: true, reviewNotes: 'Approved by P2 smoke' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/scout/progress/${CHILD_MEMBER_ID}/award`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ skillId: SKILL_ID })
      .expect(201);

    const ranks = await request(app.getHttpServer())
      .get(`/api/v1/scout/member-ranks/${CHILD_MEMBER_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(dataOf<Array<{ rankId: string; status: string }>>(ranks.body)).toEqual(
      expect.arrayContaining([expect.objectContaining({ rankId: RANK_ID, status: 'eligible' })]),
    );

    const awarded = await waitForExpAtLeast(childToken, CHILD_MEMBER_ID, before.totalExp + 30);
    expect(awarded.totalExp).toBeGreaterThanOrEqual(before.totalExp + 30);

    const transactions = await request(app.getHttpServer())
      .get(`/api/v1/rewards/exp/transactions/${CHILD_MEMBER_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(dataOf<Array<{ eventType: string; sourceEntityId: string }>>(transactions.body)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: DOMAIN_EVENTS.SCOUT.SKILL_VERIFIED,
          sourceEntityId: SKILL_ID,
        }),
      ]),
    );

    const badges = await waitForBadge(CHILD_MEMBER_ID, BADGE_ID);
    expect(badges).toEqual(
      expect.arrayContaining([expect.objectContaining({ badgeId: BADGE_ID })]),
    );
  });

  it('J5: overnight event enforces safety gate, parent consent, and check-in reward trace', async () => {
    const before = await getExpSummary(childToken, CHILD_MEMBER_ID);

    const created = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'P2 J5 Overnight Safety Camp',
        eventType: 'overnight_camp',
        startDate: '2026-06-20T08:00:00.000Z',
        endDate: '2026-06-21T10:00:00.000Z',
        location: 'P2 Safety Campground',
        maxParticipants: 30,
        targetBranches: [BRANCH_ID],
        spicesTags: ['SOCIAL'],
        raciMatrix: {
          adultOneMemberId: ADMIN_MEMBER_ID,
          adultTwoMemberId: PARENT_MEMBER_ID,
          safetyOwner: ADMIN_USER_ID,
        },
        riskAssessment: { hirarcStatus: 'completed', overnight: true },
        expReward: 12,
      })
      .expect(201);

    const eventId = dataOf<{ id: string }>(created.body).id;

    await transitionEvent(eventId, 'propose', 'proposed');
    await transitionEvent(eventId, 'approve', 'approved');
    await transitionEvent(eventId, 'open_registration', 'registration_open');

    await request(app.getHttpServer())
      .post(`/api/v1/events/${eventId}/register`)
      .set('Authorization', `Bearer ${childToken}`)
      .expect(201);

    const consent = await request(app.getHttpServer())
      .post(`/api/v1/events/${eventId}/consent`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ memberId: CHILD_MEMBER_ID, consentBy: 'P2 Parent Guardian' })
      .expect(201);

    expect(
      dataOf<{ orgMemberId: string; consentSigned: boolean; consentBy: string }>(consent.body),
    ).toMatchObject({
      orgMemberId: CHILD_MEMBER_ID,
      consentSigned: true,
      consentBy: 'P2 Parent Guardian',
    });

    await request(app.getHttpServer())
      .post(`/api/v1/events/${eventId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'go_live' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        safetyChecklist: {
          two_adult_rule: true,
          consent_reviewed: true,
          emergency_contacts_ready: true,
        },
      })
      .expect(200);

    await transitionEvent(eventId, 'go_live', 'go_live');
    await transitionEvent(eventId, 'start', 'in_progress');

    const checkedIn = await request(app.getHttpServer())
      .post(`/api/v1/events/${eventId}/check-in/${CHILD_MEMBER_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(
      dataOf<{ orgMemberId: string; status: string; checkInTime: string }>(checkedIn.body),
    ).toMatchObject({
      orgMemberId: CHILD_MEMBER_ID,
      status: 'checked_in',
    });

    const awarded = await waitForExpAtLeast(childToken, CHILD_MEMBER_ID, before.totalExp + 12);
    expect(awarded.totalExp).toBeGreaterThanOrEqual(before.totalExp + 12);
  });

  it('J6: approved plan generates project tasks, exposes due reminder data, and completes assigned task', async () => {
    const before = await getExpSummary(childToken, CHILD_MEMBER_ID);

    const plan = await request(app.getHttpServer())
      .post('/api/v1/projects/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'P2 J6 Plan To Project',
        planType: 'event',
        sectionIDescription: 'P2 J6 end-to-end plan',
        sectionIIObjectives: [{ objective: 'Close the P2 J6 workflow' }],
        sectionIVActivities: [
          { name: 'Prepare project materials', description: 'Gather materials' },
          { name: 'Run project activity', description: 'Execute activity' },
        ],
        sectionVPersonnel: {
          roles: [{ role: 'Responsible child', raci: 'R', userId: CHILD_USER_ID }],
        },
        sectionVIITimeline: { startDate: '2026-06-01', endDate: '2026-06-02' },
        sectionIXBudget: { total: 1000000, currency: 'VND' },
      })
      .expect(201);

    const planId = dataOf<{ id: string }>(plan.body).id;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/plans/${planId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'submit' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/projects/plans/${planId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' })
      .expect(201);

    const generated = await request(app.getHttpServer())
      .post(`/api/v1/projects/plans/${planId}/generate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const project = dataOf<{
      id: string;
      projectTasks: Array<{ id: string; title: string; assigneeIds: string[]; status: string }>;
    }>(generated.body);
    expect(project.projectTasks).toHaveLength(2);
    expect(project.projectTasks[0].assigneeIds).toEqual([CHILD_USER_ID]);

    const taskId = project.projectTasks[0].id;
    const dueDate = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/tasks/${taskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ dueDate, storyPoints: 2, assigneeIds: [CHILD_USER_ID] })
      .expect(200);

    const dueAlerts = await request(app.getHttpServer())
      .get('/api/v1/projects/tasks/due-alerts?hours=24')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      dataOf<Array<{ taskId: string; dueDate: string; status: string }>>(dueAlerts.body),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ taskId, status: 'todo' })]));

    await transitionTask(taskId, 'start', 'in_progress');
    await transitionTask(taskId, 'review', 'review');
    const done = await transitionTask(taskId, 'approve', 'done');
    expect(done.status).toBe('done');

    const projectDetail = await request(app.getHttpServer())
      .get(`/api/v1/projects/${project.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      dataOf<{ projectTasks: Array<{ id: string; status: string }> }>(projectDetail.body)
        .projectTasks,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ id: taskId, status: 'done' })]));

    const awarded = await waitForExpAtLeast(childToken, CHILD_MEMBER_ID, before.totalExp + 15);
    expect(awarded.totalExp).toBeGreaterThanOrEqual(before.totalExp + 15);
  });

  async function transitionEvent(eventId: string, action: string, expectedStatus: string) {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/events/${eventId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action })
      .expect(201);
    expect(dataOf<{ status: string }>(response.body).status).toBe(expectedStatus);
  }

  async function transitionTask(taskId: string, action: string, expectedStatus: string) {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/projects/tasks/${taskId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action })
      .expect(201);
    const body = dataOf<{ status: string }>(response.body);
    expect(body.status).toBe(expectedStatus);
    return body;
  }

  async function getExpSummary(token: string, memberId: string) {
    const summary = await request(app.getHttpServer())
      .get(`/api/v1/rewards/exp/summary/${memberId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return dataOf<{ totalExp: number; availableExp: number }>(summary.body);
  }

  async function waitForExpAtLeast(token: string, memberId: string, minTotalExp: number) {
    let latest = await getExpSummary(token, memberId);
    for (let attempt = 0; attempt < 30 && latest.totalExp < minTotalExp; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      latest = await getExpSummary(token, memberId);
    }
    return latest;
  }

  async function waitForBadge(memberId: string, badgeId: string) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const badges = await prisma.memberBadge.findMany({
        where: { orgId: ORG_ID, orgMemberId: memberId },
      });
      if (badges.some((badge) => badge.badgeId === badgeId)) return badges;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return prisma.memberBadge.findMany({ where: { orgId: ORG_ID, orgMemberId: memberId } });
  }
});

async function seedFixture(prisma: PrismaService) {
  await cleanupFixture(prisma);

  await prisma.organization.create({
    data: {
      id: ORG_ID,
      slug: 'ttndd-p2-j4-j6-critical',
      name: 'TTNDD P2 J4-J6 Critical',
      fullName: 'TTNDD P2 Critical Journey Fixture',
      isActive: true,
      settings: {
        enabledModules: ['SCOUT', 'EVENTS', 'PROJECTS', 'REWARDS', 'NOTIFICATIONS'],
      },
    },
  });

  await prisma.branch.create({
    data: {
      id: BRANCH_ID,
      orgId: ORG_ID,
      code: 'P2-J456',
      name: 'P2 J4-J6 Branch',
      minAge: 6,
      maxAge: 18,
    },
  });

  await prisma.unit.create({
    data: {
      id: UNIT_ID,
      orgId: ORG_ID,
      branchId: BRANCH_ID,
      name: 'P2 J4-J6 Unit',
      unitType: 'patrol',
    },
  });

  await seedUser(prisma, ADMIN_USER_ID, ADMIN_FIREBASE_UID, ADMIN_EMAIL, 'P2 J456 Admin');
  await seedUser(prisma, PARENT_USER_ID, PARENT_FIREBASE_UID, PARENT_EMAIL, 'P2 J456 Parent');
  await seedUser(prisma, CHILD_USER_ID, CHILD_FIREBASE_UID, CHILD_EMAIL, 'P2 J456 Child');

  await seedMember(prisma, ADMIN_MEMBER_ID, ADMIN_USER_ID, 'admin', 'P2-J456-ADMIN');
  await seedMember(prisma, PARENT_MEMBER_ID, PARENT_USER_ID, 'parent', 'P2-J456-PARENT');
  await seedMember(
    prisma,
    CHILD_MEMBER_ID,
    CHILD_USER_ID,
    'user',
    'P2-J456-CHILD',
    PARENT_MEMBER_ID,
  );

  await prisma.memberProfile.create({
    data: {
      orgId: ORG_ID,
      orgMemberId: CHILD_MEMBER_ID,
      fullName: 'P2 J456 Child',
      birthDate: new Date('2015-05-01'),
      consentFormSigned: true,
      createdBy: ADMIN_USER_ID,
    },
  });

  await prisma.guardianLink.create({
    data: {
      orgId: ORG_ID,
      orgMemberId: CHILD_MEMBER_ID,
      fullName: 'P2 Parent Guardian',
      relation: 'parent',
      email: PARENT_EMAIL,
      phone: '0900000456',
      isPrimary: true,
      consentSigned: true,
      consentDate: new Date('2026-05-16'),
    },
  });

  await prisma.memberExpSummary.createMany({
    data: [
      { orgId: ORG_ID, orgMemberId: ADMIN_MEMBER_ID, totalExp: 0, availableExp: 0 },
      { orgId: ORG_ID, orgMemberId: PARENT_MEMBER_ID, totalExp: 0, availableExp: 0 },
      { orgId: ORG_ID, orgMemberId: CHILD_MEMBER_ID, totalExp: 0, availableExp: 0 },
    ],
  });

  await prisma.expConfig.createMany({
    data: [
      {
        orgId: ORG_ID,
        eventType: DOMAIN_EVENTS.SCOUT.SKILL_VERIFIED,
        sourceModule: 'scout',
        actionName: 'Skill verified',
        expAmount: 30,
      },
      {
        orgId: ORG_ID,
        eventType: DOMAIN_EVENTS.EVENT.CHECKED_IN,
        sourceModule: 'event',
        actionName: 'Event check-in',
        expAmount: 12,
      },
      {
        orgId: ORG_ID,
        eventType: DOMAIN_EVENTS.PROJECT.TASK_COMPLETED,
        sourceModule: 'project',
        actionName: 'Project task completed',
        expAmount: 15,
      },
    ],
  });

  await prisma.badgeDefinition.create({
    data: {
      id: BADGE_ID,
      orgId: ORG_ID,
      badgeCode: 'P2-J4-SKILL-VERIFIED',
      name: 'P2 J4 Skill Verified',
      imageUrl: 'https://example.test/badges/p2-j4.png',
      triggerEvent: DOMAIN_EVENTS.SCOUT.SKILL_VERIFIED,
      triggerConfig: { skillId: SKILL_ID, level: 1 },
      isAutoAward: true,
    },
  });

  await prisma.rankDefinition.create({
    data: {
      id: RANK_ID,
      orgId: ORG_ID,
      branchId: BRANCH_ID,
      rankCode: 'P2-J4-RANK',
      rankName: 'P2 J4 Rank',
      rankOrder: 1,
    },
  });

  await prisma.skillGroup.create({
    data: {
      id: SKILL_GROUP_ID,
      orgId: ORG_ID,
      branchId: BRANCH_ID,
      name: 'P2 J4 Required Skills',
    },
  });

  await prisma.skill.create({
    data: {
      id: SKILL_ID,
      orgId: ORG_ID,
      skillGroupId: SKILL_GROUP_ID,
      branchId: BRANCH_ID,
      requiredForRankId: RANK_ID,
      isRequired: true,
      skillCode: 'P2-J4-SKILL',
      name: 'P2 J4 Evidence Skill',
      levels: { '1': 'Submit and verify evidence' },
      maxLevel: 1,
      expPerLevel: 30,
      spicesTags: ['INTELLECTUAL'],
    },
  });
}

async function cleanupFixture(prisma: PrismaService) {
  const notifications = await prisma.notification.findMany({
    where: { orgId: ORG_ID },
    select: { id: true },
  });
  await prisma.notificationDeliveryLog.deleteMany({
    where: { notificationId: { in: notifications.map((notification) => notification.id) } },
  });
  await prisma.notification.deleteMany({ where: { orgId: ORG_ID } });

  await prisma.domainEvent.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.eventRegistration.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.event.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.projectTask.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.project.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.plan.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.memberBadge.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.badgeDefinition.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.expTransaction.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.memberExpSummary.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.expConfig.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.skillEvidence.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.memberSkillProgress.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.memberRank.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.skill.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.skillGroup.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.rankDefinition.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.guardianLink.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.memberProfile.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.auditLog.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.orgMember.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.user.deleteMany({
    where: { id: { in: [ADMIN_USER_ID, PARENT_USER_ID, CHILD_USER_ID] } },
  });
  await prisma.unit.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.branch.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.organization.deleteMany({ where: { id: ORG_ID } });
}

async function seedUser(
  prisma: PrismaService,
  id: string,
  firebaseUid: string,
  email: string,
  displayName: string,
) {
  await prisma.user.create({
    data: { id, firebaseUid, email, displayName, isActive: true },
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
  await prisma.orgMember.create({
    data: {
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
