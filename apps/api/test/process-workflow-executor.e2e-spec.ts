import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';

const ORG_ID = '10000000-0000-4000-8000-0000000000a1';
const BRANCH_ID = '10000000-0000-4000-8000-0000000000a2';
const USER_ID = '10000000-0000-4000-8000-0000000000a3';
const MEMBER_ID = '10000000-0000-4000-8000-0000000000a4';
const EMAIL = 'p2.process.admin@pilot.ttndd.test';
const FIREBASE_UID = 'p2-process-admin';

type WorkflowRunStatus = {
  run: {
    id: string;
    status: string;
    currentNodeId: string | null;
    activeNodeIds: string[];
    waitingUntil: string | null;
  };
  timeline: Array<{ action: string; nodeId: string | null }>;
};

function dataOf<T>(body: { data: T }) {
  return body.data;
}

describe('Process workflow executor delay and parallel semantics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const token = `dev:${FIREBASE_UID}`;

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
    if (prisma) {
      await cleanupFixture(prisma);
    }
    if (app) {
      await app.close();
    }
  });

  it('waits at delay nodes and advances through the worker when the delay is due', async () => {
    const definitionId = await createDefinition('P2 Delay Workflow');
    await saveGraph(definitionId, {
      nodes: [
        node('start', 'start', 'Start'),
        node('delay', 'delay', 'Short Delay', { delayMinutes: 0.01 }),
        node('task', 'task', 'Follow-up Task'),
        node('end', 'end', 'End'),
      ],
      edges: [
        edge('start-delay', 'start', 'delay'),
        edge('delay-task', 'delay', 'task'),
        edge('task-end', 'task', 'end'),
      ],
    });

    const started = await startGraphRun(definitionId);
    expect(started.currentNodeId).toBe('delay');
    expect(started.activeNodeIds).toEqual(['delay']);
    expect(started.waitingUntil).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/api/v1/process/graph-runs/${started.id}/execute`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nodeId: 'delay', status: 'completed' })
      .expect(400);

    const afterDelay = await waitForRun(
      started.id,
      (history) => history.run.currentNodeId === 'task',
    );
    expect(afterDelay.run.activeNodeIds).toEqual(['task']);
    expect(afterDelay.timeline.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(['delay_scheduled', 'node_completed', 'transition']),
    );

    await request(app.getHttpServer())
      .post(`/api/v1/process/graph-runs/${started.id}/execute`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nodeId: 'task', status: 'completed' })
      .expect(201);

    const completed = await getHistory(started.id);
    expect(completed.run.status).toBe('completed');
    expect(completed.run.activeNodeIds).toEqual([]);
  });

  it('keeps parallel branches active until each branch reaches completion', async () => {
    const definitionId = await createDefinition('P2 Parallel Workflow');
    await saveGraph(definitionId, {
      nodes: [
        node('start', 'start', 'Start'),
        node('task-a', 'task', 'Branch A'),
        node('task-b', 'task', 'Branch B'),
        node('end', 'end', 'End'),
      ],
      edges: [
        edge('start-a', 'start', 'task-a'),
        edge('start-b', 'start', 'task-b'),
        edge('a-end', 'task-a', 'end'),
        edge('b-end', 'task-b', 'end'),
      ],
    });

    const started = await startGraphRun(definitionId);
    expect(started.activeNodeIds.sort()).toEqual(['task-a', 'task-b']);

    await request(app.getHttpServer())
      .post(`/api/v1/process/graph-runs/${started.id}/execute`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nodeId: 'task-a', status: 'completed' })
      .expect(201);

    const afterA = await getHistory(started.id);
    expect(afterA.run.status).toBe('in_progress');
    expect(afterA.run.activeNodeIds).toEqual(['task-b']);

    await request(app.getHttpServer())
      .post(`/api/v1/process/graph-runs/${started.id}/execute`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nodeId: 'task-b', status: 'completed' })
      .expect(201);

    const completed = await getHistory(started.id);
    expect(completed.run.status).toBe('completed');
    expect(completed.run.activeNodeIds).toEqual([]);
  });

  async function createDefinition(name: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/process/definitions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, steps: [{ name: 'placeholder', type: 'task' }] })
      .expect(201);

    return dataOf<{ id: string }>(response.body).id;
  }

  async function saveGraph(definitionId: string, graph: { nodes: unknown[]; edges: unknown[] }) {
    await request(app.getHttpServer())
      .post(`/api/v1/process/definitions/${definitionId}/graph`)
      .set('Authorization', `Bearer ${token}`)
      .send(graph)
      .expect(201);
  }

  async function startGraphRun(definitionId: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/process/graph-runs')
      .set('Authorization', `Bearer ${token}`)
      .send({ definitionId })
      .expect(201);

    return dataOf<{
      id: string;
      currentNodeId: string;
      activeNodeIds: string[];
      waitingUntil: string | null;
    }>(response.body);
  }

  async function getHistory(runId: string) {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/process/graph-runs/${runId}/history`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    return dataOf<WorkflowRunStatus>(response.body);
  }

  async function waitForRun(runId: string, predicate: (history: WorkflowRunStatus) => boolean) {
    let latest: WorkflowRunStatus | undefined;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      latest = await getHistory(runId);
      if (predicate(latest)) return latest;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Run ${runId} did not reach expected state. Last=${JSON.stringify(latest)}`);
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
      slug: 'ttndd-p2-process-executor',
      name: 'TTNDD P2 Process Executor',
      isActive: true,
      settings: { enabledModules: ['PROCESS'] },
    },
  });
  await prisma.branch.create({
    data: {
      id: BRANCH_ID,
      orgId: ORG_ID,
      code: 'P2-PROC',
      name: 'P2 Process Branch',
      minAge: 6,
      maxAge: 18,
    },
  });
  await prisma.user.create({
    data: {
      id: USER_ID,
      firebaseUid: FIREBASE_UID,
      email: EMAIL,
      displayName: 'P2 Process Admin',
      isActive: true,
    },
  });
  await prisma.orgMember.create({
    data: {
      id: MEMBER_ID,
      orgId: ORG_ID,
      userId: USER_ID,
      role: 'admin',
      branchId: BRANCH_ID,
      memberCode: 'P2-PROCESS-ADMIN',
      status: 'active',
    },
  });
}

async function cleanupFixture(prisma: PrismaService) {
  await prisma.workflowRunLog.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.workflowRun.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.workflowDefinition.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.domainEvent.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.auditLog.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.orgMember.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.branch.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.organization.deleteMany({ where: { id: ORG_ID } });
}
