import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';

const ORG_ID = '10000000-0000-4000-8000-000000000091';
const BRANCH_ID = '10000000-0000-4000-8000-000000000092';
const ADMIN_USER_ID = '10000000-0000-4000-8000-000000000093';
const ADMIN_MEMBER_ID = '10000000-0000-4000-8000-000000000094';
const EXISTING_USER_ID = '10000000-0000-4000-8000-000000000095';
const EXISTING_MEMBER_ID = '10000000-0000-4000-8000-000000000096';

const ADMIN_EMAIL = 'p2.import.admin@pilot.ttndd.test';
const ADMIN_FIREBASE_UID = 'p2-import-admin';
const EXISTING_EMAIL = 'p2.import.existing@pilot.ttndd.test';
const VALID_ONE_EMAIL = 'p2.import.valid1@pilot.ttndd.test';
const VALID_TWO_EMAIL = 'p2.import.valid2@pilot.ttndd.test';

type BatchStatus = {
  id: string;
  status: string;
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  duplicateRows: number;
  progressPct: number;
  validationReport: {
    rows: Array<{ row: number; status: string; message: string }>;
    errors: Array<{ row: number; field: string; message: string }>;
  };
  reportUrl: string;
};

function dataOf<T>(body: { data: T }) {
  return body.data;
}

describe('Data Import async lifecycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const token = `dev:${ADMIN_FIREBASE_UID}`;

  beforeAll(async () => {
    process.env.APP_ENV = 'development';
    process.env.GOOGLE_CLOUD_PROJECT = '';
    process.env.DATABASE_URL = 'postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops';
    process.env.DATABASE_MIGRATION_URL = 'postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops';
    process.env.DATA_IMPORT_WORKER_INTERVAL_MS = '250';

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

  it('queues, processes, deduplicates, and exposes a validation report for member CSV imports', async () => {
    const csvContent = [
      'displayName,email,phone,role,branchCode,memberCode,joinDate',
      `"P2 Import Valid 1","${VALID_ONE_EMAIL}","0900000101","user","P2-IMPORT","P2-IMP-001","2026-05-16"`,
      `"P2 Import Duplicate Email","${VALID_ONE_EMAIL}","0900000102","user","P2-IMPORT","P2-IMP-DUP","2026-05-16"`,
      '"P2 Import Invalid Email","not-an-email","0900000103","user","P2-IMPORT","P2-IMP-003","2026-05-16"',
      `"P2 Import Existing","${EXISTING_EMAIL}","0900000104","user","P2-IMPORT","P2-IMP-004","2026-05-16"`,
      `"P2 Import Valid 2","${VALID_TWO_EMAIL}","0900000105","user","P2-IMPORT","P2-IMP-002","2026-05-16"`,
    ].join('\n');

    const queued = await request(app.getHttpServer())
      .post('/api/v1/data-import/members/async')
      .set('Authorization', `Bearer ${token}`)
      .send({ csvContent, isDryRun: false })
      .expect(201);

    const queuedBody = dataOf<{ batchId: string; status: string; progressPct: number }>(
      queued.body,
    );
    expect(queuedBody.status).toBe('queued');
    expect(queuedBody.progressPct).toBe(0);

    const finalBatch = await waitForBatch(queuedBody.batchId);
    expect(finalBatch).toMatchObject({
      status: 'completed_with_errors',
      totalRows: 5,
      processedRows: 5,
      successRows: 2,
      errorRows: 1,
      duplicateRows: 2,
      progressPct: 100,
    });

    expect(finalBatch.validationReport.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'success', message: 'Imported member' }),
        expect.objectContaining({ status: 'duplicate' }),
        expect.objectContaining({ status: 'error' }),
      ]),
    );
    expect(finalBatch.validationReport.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email', message: 'Invalid email: not-an-email' }),
      ]),
    );

    const importedMembers = await prisma.orgMember.findMany({
      where: {
        orgId: ORG_ID,
        memberCode: { in: ['P2-IMP-001', 'P2-IMP-002', 'P2-IMP-DUP', 'P2-IMP-003'] },
      },
      select: { memberCode: true },
      orderBy: { memberCode: 'asc' },
    });
    expect(importedMembers.map((member) => member.memberCode)).toEqual([
      'P2-IMP-001',
      'P2-IMP-002',
    ]);

    const report = await request(app.getHttpServer())
      .get(`/api/v1/data-import/batches/${queuedBody.batchId}/report`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(report.headers['content-type']).toContain('text/csv');
    expect(report.text).toContain('Duplicate email');
    expect(report.text).toContain('Invalid email: not-an-email');
    expect(report.text).toContain('Imported member');
  });

  async function waitForBatch(batchId: string): Promise<BatchStatus> {
    let latest: BatchStatus | undefined;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/data-import/batches/${batchId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      latest = dataOf<BatchStatus>(response.body);
      if (latest.progressPct === 100 && !['queued', 'processing'].includes(latest.status)) {
        return latest;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Import batch ${batchId} did not finish. Last=${JSON.stringify(latest)}`);
  }
});

async function seedFixture(prisma: PrismaService) {
  await cleanupFixture(prisma);
  await prisma.organization.create({
    data: {
      id: ORG_ID,
      slug: 'ttndd-p2-data-import',
      name: 'TTNDD P2 Data Import',
      isActive: true,
      settings: { enabledModules: ['HRM', 'DATA_IMPORT'] },
    },
  });
  await prisma.branch.create({
    data: {
      id: BRANCH_ID,
      orgId: ORG_ID,
      code: 'P2-IMPORT',
      name: 'P2 Import Branch',
      minAge: 6,
      maxAge: 18,
    },
  });
  await prisma.user.create({
    data: {
      id: ADMIN_USER_ID,
      firebaseUid: ADMIN_FIREBASE_UID,
      email: ADMIN_EMAIL,
      displayName: 'P2 Import Admin',
      isActive: true,
    },
  });
  await prisma.orgMember.create({
    data: {
      id: ADMIN_MEMBER_ID,
      orgId: ORG_ID,
      userId: ADMIN_USER_ID,
      role: 'admin',
      branchId: BRANCH_ID,
      memberCode: 'P2-IMPORT-ADMIN',
      status: 'active',
    },
  });
  await prisma.user.create({
    data: {
      id: EXISTING_USER_ID,
      firebaseUid: 'p2-import-existing',
      email: EXISTING_EMAIL,
      displayName: 'P2 Import Existing Member',
      isActive: true,
    },
  });
  await prisma.orgMember.create({
    data: {
      id: EXISTING_MEMBER_ID,
      orgId: ORG_ID,
      userId: EXISTING_USER_ID,
      role: 'user',
      branchId: BRANCH_ID,
      memberCode: 'P2-EXISTING-001',
      status: 'active',
    },
  });
}

async function cleanupFixture(prisma: PrismaService) {
  await prisma.domainEvent.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.auditLog.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.importBatch.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.orgMember.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [ADMIN_EMAIL, EXISTING_EMAIL, VALID_ONE_EMAIL, VALID_TWO_EMAIL, 'not-an-email'],
      },
    },
  });
  await prisma.branch.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.organization.deleteMany({ where: { id: ORG_ID } });
}
