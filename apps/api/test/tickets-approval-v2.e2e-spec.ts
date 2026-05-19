import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';

const ORG_ID = '31000000-0000-4000-8000-000000000001';
const ADMIN_USER_ID = '31000000-0000-4000-8000-000000000011';
const ADMIN_MEMBER_ID = '31000000-0000-4000-8000-000000000012';
const ADMIN_EMAIL = 'p3.approval.admin@pilot.ttndd.test';
const ADMIN_FIREBASE_UID = 'p3-approval-admin';

type Wrapped<T> = { data: T };

function dataOf<T>(body: Wrapped<T>) {
  return body.data;
}

describe('P3-004 ticket approval v2 flows (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminToken = `dev:${ADMIN_FIREBASE_UID}`;

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

  it('creates and completes a two-step approval flow while preserving legacy ticket approval fields', async () => {
    const ticket = await request(app.getHttpServer())
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'P3 Approval v2 budget request',
        description: 'Requires two sequential approval steps',
        category: 'Finance',
        priority: 'medium',
        tags: ['p3', 'approval-v2'],
      })
      .expect(201);
    const ticketId = dataOf<{ id: string }>(ticket.body).id;

    const approval = await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/approval`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        approvalType: 'budget',
        amount: 750000,
        notes: 'P3 approval v2 manual flow',
        steps: [
          { stepName: 'Finance review', approverRole: 'admin', dueInHours: 24 },
          { stepName: 'Committee approval', approverRole: 'admin', dueInHours: 48 },
        ],
      })
      .expect(201);
    const approvalBody = dataOf<{
      approvalStatus: string;
      flowId: string;
      currentStepOrder: number;
      totalSteps: number;
    }>(approval.body);
    expect(approvalBody).toMatchObject({
      approvalStatus: 'pending',
      currentStepOrder: 1,
      totalSteps: 2,
    });

    const initialFlow = await request(app.getHttpServer())
      .get(`/api/v1/tickets/${ticketId}/approval-flow`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      dataOf<{
        flow: {
          id: string;
          status: string;
          currentStepOrder: number;
          slaDueAt: string | null;
          steps: Array<{ stepOrder: number; status: string; dueAt: string | null }>;
        };
      }>(initialFlow.body).flow,
    ).toMatchObject({
      id: approvalBody.flowId,
      status: 'pending',
      currentStepOrder: 1,
      steps: [
        { stepOrder: 1, status: 'pending' },
        { stepOrder: 2, status: 'pending' },
      ],
    });
    expect(
      dataOf<{ flow: { slaDueAt: string | null } }>(initialFlow.body).flow.slaDueAt,
    ).toBeTruthy();

    const firstDecision = await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'approve', notes: 'Finance approved' })
      .expect(201);
    expect(
      dataOf<{ approvalStatus: string; currentStepOrder: number }>(firstDecision.body),
    ).toMatchObject({
      approvalStatus: 'pending',
      currentStepOrder: 2,
    });

    const afterFirst = await request(app.getHttpServer())
      .get(`/api/v1/tickets/${ticketId}/approval-flow`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const flowAfterFirst = dataOf<{
      flow: {
        status: string;
        currentStepOrder: number;
        steps: Array<{ stepOrder: number; status: string }>;
        decisions: Array<{ decision: string }>;
      };
    }>(afterFirst.body).flow;
    expect(flowAfterFirst.status).toBe('pending');
    expect(flowAfterFirst.currentStepOrder).toBe(2);
    expect(flowAfterFirst.steps.map((step) => `${step.stepOrder}:${step.status}`)).toEqual([
      '1:approved',
      '2:pending',
    ]);
    expect(flowAfterFirst.decisions.map((decision) => decision.decision)).toEqual(['approved']);

    const secondDecision = await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'approve', notes: 'Committee approved' })
      .expect(201);
    expect(
      dataOf<{ approvalStatus: string; completed: boolean }>(secondDecision.body),
    ).toMatchObject({
      approvalStatus: 'approved',
      completed: true,
    });

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const ticketDetail = dataOf<{
      customFields: {
        approvalRequest?: {
          flowId: string;
          status: string;
          currentStepOrder: number;
          totalSteps: number;
          lastDecision: string;
        };
      };
    }>(detail.body);
    expect(ticketDetail.customFields.approvalRequest).toMatchObject({
      flowId: approvalBody.flowId,
      status: 'approved',
      currentStepOrder: 2,
      totalSteps: 2,
      lastDecision: 'approved',
    });

    const completedFlow = await request(app.getHttpServer())
      .get(`/api/v1/tickets/${ticketId}/approval-flow`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const flow = dataOf<{
      flow: {
        status: string;
        steps: Array<{ status: string }>;
        decisions: Array<{ decision: string }>;
      };
    }>(completedFlow.body).flow;
    expect(flow.status).toBe('approved');
    expect(flow.steps.map((step) => step.status)).toEqual(['approved', 'approved']);
    expect(flow.decisions.map((decision) => decision.decision)).toEqual(['approved', 'approved']);
  });
});

async function seedFixture(prisma: PrismaService) {
  await cleanupFixture(prisma);

  await prisma.organization.create({
    data: {
      id: ORG_ID,
      slug: 'ttndd-p3-approval-v2',
      name: 'TTNDD P3 Approval v2',
      fullName: 'TTNDD P3 Approval v2 Fixture',
      isActive: true,
      settings: {
        enabledModules: ['TICKETS'],
      },
    },
  });

  await prisma.user.create({
    data: {
      id: ADMIN_USER_ID,
      firebaseUid: ADMIN_FIREBASE_UID,
      email: ADMIN_EMAIL,
      displayName: 'P3 Approval Admin',
      isActive: true,
    },
  });

  await prisma.orgMember.create({
    data: {
      id: ADMIN_MEMBER_ID,
      orgId: ORG_ID,
      userId: ADMIN_USER_ID,
      role: 'admin',
      memberCode: 'P3-APPROVAL-ADMIN',
      status: 'active',
      joinedDate: new Date('2026-01-01'),
    },
  });
}

async function cleanupFixture(prisma: PrismaService) {
  await prisma.approvalDecision.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.approvalStep.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.approvalFlow.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.ticketComment.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.ticketStatusHistory.deleteMany({
    where: { ticket: { orgId: ORG_ID } },
  });
  await prisma.ticket.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.domainEvent.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.auditLog.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.orgMember.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.user.deleteMany({ where: { id: ADMIN_USER_ID } });
  await prisma.organization.deleteMany({ where: { id: ORG_ID } });
}
