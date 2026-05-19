import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';

const ORG_ID = '22000000-0000-4000-8000-000000000001';
const BRANCH_ID = '22000000-0000-4000-8000-000000000002';
const UNIT_ID = '22000000-0000-4000-8000-000000000003';

const ADMIN_USER_ID = '22000000-0000-4000-8000-000000000011';
const ADMIN_MEMBER_ID = '22000000-0000-4000-8000-000000000012';
const ADMIN_EMAIL = 'p2.j101112.admin@pilot.ttndd.test';
const ADMIN_FIREBASE_UID = 'p2-j101112-admin';

const CHILD_USER_ID = '22000000-0000-4000-8000-000000000031';
const CHILD_MEMBER_ID = '22000000-0000-4000-8000-000000000032';
const CHILD_EMAIL = 'p2.j101112.child@pilot.ttndd.test';
const CHILD_FIREBASE_UID = 'p2-j101112-child';

type Wrapped<T> = { data: T };

function dataOf<T>(body: Wrapped<T>) {
  return body.data;
}

describe('P2 J10-J12 critical workflows (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminToken = `dev:${ADMIN_FIREBASE_UID}`;
  const childToken = `dev:${CHILD_FIREBASE_UID}`;

  beforeAll(async () => {
    process.env.APP_ENV = 'development';
    process.env.GOOGLE_CLOUD_PROJECT = '';
    process.env.DATABASE_URL = 'postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops';
    process.env.DATABASE_MIGRATION_URL = 'postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops';
    process.env.WORKFLOW_DELAY_WORKER_INTERVAL_MS = '100';

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

  it('J10: publishing an SOP triggers workflow action execution and exposes run history', async () => {
    const sop = await request(app.getHttpServer())
      .post('/api/v1/process/sops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'P2 J10 Published SOP',
        category: 'safety',
        tags: ['p2-j10'],
        content: { type: 'doc', content: [{ type: 'paragraph', text: 'Initial SOP' }] },
      })
      .expect(201);
    const sopId = dataOf<{ id: string }>(sop.body).id;

    const definitionId = await createDefinition('P2 J10 SOP Published Workflow');
    await saveGraph(definitionId, {
      nodes: [
        node('start', 'start', 'Start'),
        node('notify', 'notification', 'Notify leaders', {
          notificationTemplate: 'sop-published',
          notificationChannel: 'in_app',
        }),
        node('task', 'task', 'Review published SOP'),
        node('end', 'end', 'End'),
      ],
      edges: [
        edge('start-notify', 'start', 'notify'),
        edge('notify-task', 'notify', 'task'),
        edge('task-end', 'task', 'end'),
      ],
      triggers: [
        {
          id: 'trigger-sop-published',
          eventType: 'sop.version.published',
          conditions: { documentId: sopId, versionNo: 1 },
        },
      ],
    });

    await request(app.getHttpServer())
      .post(`/api/v1/process/sops/${sopId}/versions/1/submit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/process/sops/${sopId}/versions/1/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: true, comments: 'Approved for P2 J10' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/process/sops/${sopId}/versions/1/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const triggered = await waitForWorkflowRun(definitionId);
    expect(triggered.activeNodeIds).toEqual(['task']);

    const afterNotification = await getHistory(triggered.id);
    expect(afterNotification.timeline.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(['run_started', 'transition', 'node_completed']),
    );
    expect(afterNotification.timeline.some((entry) => entry.nodeId === 'notify')).toBe(true);

    const notificationEvent = await waitForDomainEvent('workflow.notification.requested', {
      aggregateId: triggered.id,
    });
    expect(notificationEvent.payload).toMatchObject({
      nodeId: 'notify',
      template: 'sop-published',
      channel: 'in_app',
    });

    await request(app.getHttpServer())
      .post(`/api/v1/process/graph-runs/${triggered.id}/execute`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nodeId: 'task', status: 'completed', notes: 'SOP action closed' })
      .expect(201);

    const completed = await getHistory(triggered.id);
    expect(completed.run.status).toBe('completed');
    expect(completed.run.activeNodeIds).toEqual([]);
    expect(completed.timeline.map((entry) => entry.nodeId)).toEqual(
      expect.arrayContaining(['task']),
    );
  });

  it('J11: LMS course, mentor grading, quiz pass, and reward trace are DB-backed', async () => {
    const course = await request(app.getHttpServer())
      .post('/api/v1/lms/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'P2 J11 Mentor Course',
        description: 'Course used for P2 J11 critical journey',
        category: 'scouting',
        difficulty: 'beginner',
        targetBranches: [BRANCH_ID],
        status: 'published',
        expReward: 30,
        spicesTags: ['skill'],
      })
      .expect(201);
    const courseId = dataOf<{ id: string }>(course.body).id;

    const lesson = await request(app.getHttpServer())
      .post(`/api/v1/lms/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'P2 J11 Lesson',
        orderIndex: 1,
        lessonType: 'text',
        content: { blocks: [{ type: 'paragraph', text: 'Learn the SOP' }] },
        expReward: 5,
        isRequired: true,
        spicesTags: ['skill'],
      })
      .expect(201);
    const lessonId = dataOf<{ id: string }>(lesson.body).id;

    const quiz = await request(app.getHttpServer())
      .post('/api/v1/lms/quizzes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'P2 J11 Mentor Quiz',
        description: 'Essay quiz requiring mentor grading',
        quizType: 'course',
        courseId,
        passingScore: 70,
        maxRetries: 2,
        expReward: 15,
      })
      .expect(201);
    const quizId = dataOf<{ id: string }>(quiz.body).id;

    const question = await request(app.getHttpServer())
      .post(`/api/v1/lms/quizzes/${quizId}/questions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        questionText: 'Explain the safety rule',
        questionType: 'essay',
        options: { rubric: 'Mention buddy system and escalation' },
        points: 10,
        orderIndex: 1,
      })
      .expect(201);
    const questionId = dataOf<{ id: string }>(question.body).id;

    await request(app.getHttpServer())
      .post(`/api/v1/lms/courses/${courseId}/enroll`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ memberId: CHILD_MEMBER_ID })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/lms/lessons/${lessonId}/complete`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ memberId: CHILD_MEMBER_ID })
      .expect(201);

    const attempt = await request(app.getHttpServer())
      .post(`/api/v1/lms/quizzes/${quizId}/attempts/start`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ memberId: CHILD_MEMBER_ID })
      .expect(201);
    const attemptId = dataOf<{ id: string }>(attempt.body).id;

    const submitted = await request(app.getHttpServer())
      .post(`/api/v1/lms/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({
        answers: [
          {
            questionId,
            selectedAnswer: 'Use the buddy system and escalate to leaders.',
          },
        ],
      })
      .expect(201);
    expect(dataOf<{ status: string }>(submitted.body).status).toBe('submitted');

    const queue = await request(app.getHttpServer())
      .get('/api/v1/lms/grading-queue')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(dataOf<Array<{ id: string }>>(queue.body).map((item) => item.id)).toContain(attemptId);

    const graded = await request(app.getHttpServer())
      .post(`/api/v1/lms/attempts/${attemptId}/grade`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ score: 95, passed: true, feedback: 'Strong answer' })
      .expect(201);
    expect(dataOf<{ status: string; passed: boolean }>(graded.body)).toMatchObject({
      status: 'graded',
      passed: true,
    });

    const progress = await request(app.getHttpServer())
      .get(`/api/v1/lms/progress/${CHILD_MEMBER_ID}`)
      .set('Authorization', `Bearer ${childToken}`)
      .expect(200);
    expect(
      dataOf<Array<{ courseId: string; status: string; progressPct: number }>>(progress.body),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ courseId, status: 'completed', progressPct: 100 }),
      ]),
    );

    const rewardTransactions = await waitForExpTransactions(CHILD_MEMBER_ID, [
      DOMAIN_EVENTS.LMS.LESSON_COMPLETED,
      DOMAIN_EVENTS.LMS.COURSE_COMPLETED,
      DOMAIN_EVENTS.LMS.QUIZ_PASSED,
    ]);
    expect(rewardTransactions.map((tx) => tx.eventType)).toEqual(
      expect.arrayContaining([
        DOMAIN_EVENTS.LMS.LESSON_COMPLETED,
        DOMAIN_EVENTS.LMS.COURSE_COMPLETED,
        DOMAIN_EVENTS.LMS.QUIZ_PASSED,
      ]),
    );
  });

  it('J12: reward redemption spends EXP, reserves stock, approval closes request, and ledger remains traceable', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/rewards/exp/award')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ memberId: CHILD_MEMBER_ID, amount: 100, notes: 'P2 J12 seed EXP' })
      .expect(201);

    const item = await request(app.getHttpServer())
      .post('/api/v1/rewards/shop/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'P2 J12 Reward Item',
        description: 'One-stock reward used by P2 J12',
        costExp: 40,
        category: 'kit',
        quantityAvailable: 1,
      })
      .expect(201);
    const rewardId = dataOf<{ id: string }>(item.body).id;

    const redemption = await request(app.getHttpServer())
      .post('/api/v1/rewards/shop/redeem')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ rewardId })
      .expect(201);
    const redemptionId = dataOf<{ id: string; status: string; expSpent: number }>(
      redemption.body,
    ).id;
    expect(dataOf<{ status: string; expSpent: number }>(redemption.body)).toMatchObject({
      status: 'pending',
      expSpent: 40,
    });

    const itemsAfterRedeem = await request(app.getHttpServer())
      .get('/api/v1/rewards/shop/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      dataOf<Array<{ id: string; quantityAvailable: number }>>(itemsAfterRedeem.body).find(
        (entry) => entry.id === rewardId,
      )?.quantityAvailable,
    ).toBe(0);

    await request(app.getHttpServer())
      .post('/api/v1/rewards/shop/redeem')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ rewardId })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/v1/rewards/shop/redemptions/${redemptionId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const myRedemptions = await request(app.getHttpServer())
      .get('/api/v1/rewards/shop/my-redemptions')
      .set('Authorization', `Bearer ${childToken}`)
      .expect(200);
    expect(
      dataOf<Array<{ id: string; status: string; expSpent: number }>>(myRedemptions.body),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: redemptionId, status: 'approved', expSpent: 40 }),
      ]),
    );

    const summary = await request(app.getHttpServer())
      .get(`/api/v1/rewards/exp/summary/${CHILD_MEMBER_ID}`)
      .set('Authorization', `Bearer ${childToken}`)
      .expect(200);
    expect(dataOf<{ availableExp: number }>(summary.body).availableExp).toBeGreaterThanOrEqual(60);

    const ledger = await request(app.getHttpServer())
      .get(`/api/v1/rewards/exp/transactions/${CHILD_MEMBER_ID}`)
      .set('Authorization', `Bearer ${childToken}`)
      .expect(200);
    expect(
      dataOf<Array<{ transactionType: string; expAmount: number; deductionReason: string | null }>>(
        ledger.body,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionType: 'deduct',
          expAmount: -40,
          deductionReason: 'Redeem: P2 J12 Reward Item',
        }),
      ]),
    );
  });

  async function createDefinition(name: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/process/definitions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, steps: [{ name: 'placeholder', type: 'task' }] })
      .expect(201);

    return dataOf<{ id: string }>(response.body).id;
  }

  async function saveGraph(
    definitionId: string,
    graph: { nodes: unknown[]; edges: unknown[]; triggers?: unknown[] },
  ) {
    await request(app.getHttpServer())
      .post(`/api/v1/process/definitions/${definitionId}/graph`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(graph)
      .expect(201);
  }

  async function getHistory(runId: string) {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/process/graph-runs/${runId}/history`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    return dataOf<{
      run: { id: string; status: string; activeNodeIds: string[] };
      timeline: Array<{ action: string; nodeId: string | null }>;
    }>(response.body);
  }

  async function waitForWorkflowRun(definitionId: string) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const run = await prisma.workflowRun.findFirst({
        where: { orgId: ORG_ID, definitionId },
        orderBy: { createdAt: 'desc' },
      });
      if (run) return run;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`No workflow run created for definition ${definitionId}`);
  }

  async function waitForDomainEvent(eventType: string, where: { aggregateId?: string }) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const event = await prisma.domainEvent.findFirst({
        where: { orgId: ORG_ID, eventType, aggregateId: where.aggregateId },
        orderBy: { createdAt: 'desc' },
      });
      if (event) return event;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`No domain event ${eventType} created`);
  }

  async function waitForExpTransactions(memberId: string, eventTypes: string[]) {
    let latest: Array<{ eventType: string | null }> = [];
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/rewards/exp/transactions/${memberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      latest = dataOf<Array<{ eventType: string | null }>>(response.body);
      if (eventTypes.every((eventType) => latest.some((tx) => tx.eventType === eventType))) {
        return latest;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(
      `EXP transactions not found. Expected=${eventTypes.join(', ')} latest=${JSON.stringify(latest)}`,
    );
  }
});

function node(id: string, type: string, label: string, data: Record<string, unknown> = {}) {
  return {
    id,
    type,
    label,
    position: { x: 0, y: 0 },
    data,
  };
}

function edge(id: string, source: string, target: string) {
  return { id, source, target };
}

async function seedFixture(prisma: PrismaService) {
  await cleanupFixture(prisma);
  await prisma.organization.create({
    data: {
      id: ORG_ID,
      slug: 'ttndd-p2-j10-j12',
      name: 'TTNDD P2 J10-J12',
      isActive: true,
      settings: { enabledModules: ['PROCESS', 'LMS', 'REWARDS'] },
    },
  });
  await prisma.branch.create({
    data: {
      id: BRANCH_ID,
      orgId: ORG_ID,
      code: 'P2-J101112',
      name: 'P2 J10-J12 Branch',
      minAge: 6,
      maxAge: 18,
    },
  });
  await prisma.unit.create({
    data: {
      id: UNIT_ID,
      orgId: ORG_ID,
      branchId: BRANCH_ID,
      name: 'P2 J10-J12 Unit',
      unitType: 'patrol',
    },
  });
  await prisma.user.createMany({
    data: [
      {
        id: ADMIN_USER_ID,
        firebaseUid: ADMIN_FIREBASE_UID,
        email: ADMIN_EMAIL,
        displayName: 'P2 J10-J12 Admin',
        isActive: true,
      },
      {
        id: CHILD_USER_ID,
        firebaseUid: CHILD_FIREBASE_UID,
        email: CHILD_EMAIL,
        displayName: 'P2 J10-J12 Child',
        isActive: true,
      },
    ],
  });
  await prisma.orgMember.createMany({
    data: [
      {
        id: ADMIN_MEMBER_ID,
        orgId: ORG_ID,
        userId: ADMIN_USER_ID,
        role: 'admin',
        branchId: BRANCH_ID,
        unitId: UNIT_ID,
        memberCode: 'P2-J101112-ADMIN',
        status: 'active',
      },
      {
        id: CHILD_MEMBER_ID,
        orgId: ORG_ID,
        userId: CHILD_USER_ID,
        role: 'child',
        branchId: BRANCH_ID,
        unitId: UNIT_ID,
        memberCode: 'P2-J101112-CHILD',
        status: 'active',
      },
    ],
  });
  await prisma.memberProfile.create({
    data: {
      orgId: ORG_ID,
      orgMemberId: CHILD_MEMBER_ID,
      fullName: 'P2 J10-J12 Child',
      birthDate: new Date('2014-01-01'),
    },
  });
}

async function cleanupFixture(prisma: PrismaService) {
  await prisma.workflowRunLog.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.workflowRun.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.workflowDefinition.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.sopApproval.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.sopVersion.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.sopDocument.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.quizAttempt.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.quizQuestion.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.quiz.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.lessonProgress.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.memberCourseProgress.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.completionRule.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.courseCompetency.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.lesson.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.courseModule.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.course.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.rewardRedemption.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.rewardItem.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.expTransaction.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.memberExpSummary.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.domainEvent.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.auditLog.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.memberProfile.deleteMany({ where: { orgMemberId: CHILD_MEMBER_ID } });
  await prisma.orgMember.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.user.deleteMany({ where: { id: { in: [ADMIN_USER_ID, CHILD_USER_ID] } } });
  await prisma.unit.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.branch.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.organization.deleteMany({ where: { id: ORG_ID } });
}
