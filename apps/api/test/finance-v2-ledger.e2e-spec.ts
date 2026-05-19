import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';

const ORG_ID = '26000000-0000-4000-8000-000000000001';
const ADMIN_USER_ID = '26000000-0000-4000-8000-000000000011';
const ADMIN_MEMBER_ID = '26000000-0000-4000-8000-000000000012';
const ADMIN_EMAIL = 'p3.finance.admin@pilot.ttndd.test';
const ADMIN_FIREBASE_UID = 'p3-finance-admin';

type Wrapped<T> = { data: T };

function dataOf<T>(body: Wrapped<T>) {
  return body.data;
}

describe('P3 finance v2 ledger (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminToken = `dev:${ADMIN_FIREBASE_UID}`;

  beforeAll(async () => {
    process.env.APP_ENV = 'development';
    process.env.GOOGLE_CLOUD_PROJECT = '';
    process.env.FINANCE_DOUBLE_ENTRY = 'true';
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
    delete process.env.FINANCE_DOUBLE_ENTRY;
  });

  it('persists finance master data and posts balanced double-entry ledger entries', async () => {
    const account = await request(app.getHttpServer())
      .post('/api/v1/finance/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'P3 Finance Cash', accountType: 'cash', currency: 'VND' })
      .expect(201);
    const accountId = dataOf<{ id: string }>(account.body).id;

    const costCenter = await request(app.getHttpServer())
      .post('/api/v1/finance/cost-centers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'P3 Training Camp', code: 'P3-CAMP', budgetAmount: 1000 })
      .expect(201);
    const costCenterData = dataOf<{ id: string; budgetAmount: number }>(costCenter.body);
    expect(costCenterData.budgetAmount).toBe(1000);

    const feePlan = await request(app.getHttpServer())
      .post('/api/v1/finance/fee-plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'P3 Quarterly Dues',
        frequency: 'quarterly',
        amount: 250,
        feeType: 'dues',
        startDate: '2026-06-01',
      })
      .expect(201);
    expect(dataOf<{ amount: number }>(feePlan.body).amount).toBe(250);

    const sponsor = await request(app.getHttpServer())
      .post('/api/v1/finance/sponsors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'P3 Parent Board',
        contributionType: 'cash',
        amount: 500,
        receivedDate: '2026-05-16',
      })
      .expect(201);
    expect(dataOf<{ amount: number }>(sponsor.body).amount).toBe(500);

    const transaction = await request(app.getHttpServer())
      .post('/api/v1/finance/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        accountId,
        transactionType: 'expense',
        category: 'camp',
        costCenterId: costCenterData.id,
        amount: 300,
        description: 'P3 camp supplies',
        referenceNo: 'P3-FIN-001',
        transactionDate: '2026-05-16',
      })
      .expect(201);
    const transactionId = dataOf<{ id: string }>(transaction.body).id;

    await request(app.getHttpServer())
      .post(`/api/v1/finance/transactions/${transactionId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/finance/transactions/${transactionId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'complete' })
      .expect(201);

    const ledger = await request(app.getHttpServer())
      .get(`/api/v1/finance/ledger?transactionId=${transactionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const ledgerData = ledger.body as {
      data: Array<{ entryType: string; ledgerAccount: string; amount: number }>;
      meta: { totals: { debit: number; credit: number; balanced: boolean } };
    };
    expect(ledgerData.data).toHaveLength(2);
    expect(ledgerData.meta.totals).toEqual({ debit: 300, credit: 300, balanced: true });
    expect(
      ledgerData.data.map((entry) => `${entry.entryType}:${entry.ledgerAccount}`).sort(),
    ).toEqual(['credit:cash', 'debit:expense']);

    const variance = await request(app.getHttpServer())
      .get('/api/v1/finance/budget-variance')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      dataOf<{ variance: Array<{ costCenterId: string; spent: number; remaining: number }> }>(
        variance.body,
      ).variance.find((row) => row.costCenterId === costCenterData.id),
    ).toMatchObject({ spent: 300, remaining: 700 });

    const reconciliation = await request(app.getHttpServer())
      .get('/api/v1/finance/reconciliation')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      dataOf<{ allReconciled: boolean; allLedgerReconciled: boolean }>(reconciliation.body),
    ).toMatchObject({ allReconciled: true, allLedgerReconciled: true });

    const sponsorSummary = await request(app.getHttpServer())
      .get('/api/v1/finance/sponsors')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      dataOf<{ summary: { cashTotal: number; grandTotal: number } }>(sponsorSummary.body).summary,
    ).toMatchObject({
      cashTotal: 500,
      grandTotal: 500,
    });
  });
});

async function seedFixture(prisma: PrismaService) {
  await cleanupFixture(prisma);

  await prisma.organization.create({
    data: {
      id: ORG_ID,
      slug: 'ttndd-p3-finance-v2',
      name: 'TTNDD P3 Finance V2',
      fullName: 'TTNDD P3 Finance V2 Fixture',
      isActive: true,
      settings: { enabledModules: ['FINANCE'] },
    },
  });

  await prisma.user.create({
    data: {
      id: ADMIN_USER_ID,
      firebaseUid: ADMIN_FIREBASE_UID,
      email: ADMIN_EMAIL,
      displayName: 'P3 Finance Admin',
      isActive: true,
    },
  });

  await prisma.orgMember.create({
    data: {
      id: ADMIN_MEMBER_ID,
      orgId: ORG_ID,
      userId: ADMIN_USER_ID,
      role: 'admin',
      memberCode: 'P3-FIN-ADMIN',
      status: 'active',
      joinedDate: new Date('2026-01-01'),
    },
  });
}

async function cleanupFixture(prisma: PrismaService) {
  await prisma.ledgerEntry.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.financialTransaction.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.financialAccount.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.costCenter.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.feePlan.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.sponsor.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.auditLog.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.domainEvent.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.orgMember.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.user.deleteMany({ where: { id: ADMIN_USER_ID } });
  await prisma.organization.deleteMany({ where: { id: ORG_ID } });
}
