import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';

const ORG_ID = '21000000-0000-4000-8000-000000000001';
const BRANCH_ID = '21000000-0000-4000-8000-000000000002';
const UNIT_ID = '21000000-0000-4000-8000-000000000003';

const ADMIN_USER_ID = '21000000-0000-4000-8000-000000000011';
const ADMIN_MEMBER_ID = '21000000-0000-4000-8000-000000000012';
const ADMIN_EMAIL = 'p2.j789.admin@pilot.ttndd.test';
const ADMIN_FIREBASE_UID = 'p2-j789-admin';

const PARENT_USER_ID = '21000000-0000-4000-8000-000000000021';
const PARENT_MEMBER_ID = '21000000-0000-4000-8000-000000000022';
const PARENT_EMAIL = 'p2.j789.parent@pilot.ttndd.test';
const PARENT_FIREBASE_UID = 'p2-j789-parent';

const CHILD_USER_ID = '21000000-0000-4000-8000-000000000031';
const CHILD_MEMBER_ID = '21000000-0000-4000-8000-000000000032';
const CHILD_EMAIL = 'p2.j789.child@pilot.ttndd.test';
const CHILD_FIREBASE_UID = 'p2-j789-child';

type Wrapped<T> = { data: T };

function dataOf<T>(body: Wrapped<T>) {
  return body.data;
}

describe('P2 J7-J9 critical workflows (e2e)', () => {
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

  it('J7: fee partial payment, overdue notice, full payment, and finance reconciliation are DB-backed', async () => {
    const account = await request(app.getHttpServer())
      .post('/api/v1/finance/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'P2 J7 Cash Account', accountType: 'cash', currency: 'VND' })
      .expect(201);
    const accountId = dataOf<{ id: string }>(account.body).id;

    const fee = await request(app.getHttpServer())
      .post('/api/v1/finance/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orgMemberId: CHILD_MEMBER_ID,
        feeType: 'monthly',
        feePeriod: '2026-05',
        amountDue: 1000,
        dueDate: '2026-05-01',
      })
      .expect(201);
    const feeId = dataOf<{ id: string }>(fee.body).id;

    const firstTxId = await createAndCompleteIncome(accountId, feeId, 400, 'P2-J7-PARTIAL');

    const partial = await request(app.getHttpServer())
      .post(`/api/v1/finance/fees/${feeId}/pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 400, transactionId: firstTxId })
      .expect(201);
    expect(dataOf<{ status: string; amountPaid: string }>(partial.body)).toMatchObject({
      status: 'partial',
    });

    const overdue = await request(app.getHttpServer())
      .post(`/api/v1/finance/fees/${feeId}/mark-overdue`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    expect(dataOf<{ status: string }>(overdue.body).status).toBe('overdue');

    const notifications = await waitForNotifications(DOMAIN_EVENTS.FINANCE.FEE_OVERDUE, [
      CHILD_MEMBER_ID,
      PARENT_MEMBER_ID,
    ]);
    expect(notifications.map((notification) => notification.recipientId).sort()).toEqual(
      [CHILD_MEMBER_ID, PARENT_MEMBER_ID].sort(),
    );

    const secondTxId = await createAndCompleteIncome(accountId, feeId, 600, 'P2-J7-FULL');
    const paid = await request(app.getHttpServer())
      .post(`/api/v1/finance/fees/${feeId}/pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 600, transactionId: secondTxId })
      .expect(201);
    expect(dataOf<{ status: string }>(paid.body).status).toBe('paid');

    const memberFees = await request(app.getHttpServer())
      .get(`/api/v1/finance/fees/member/${CHILD_MEMBER_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(dataOf<{ summary: { outstanding: number } }>(memberFees.body).summary.outstanding).toBe(
      0,
    );

    const reconciliation = await request(app.getHttpServer())
      .get('/api/v1/finance/reconciliation')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(dataOf<{ allReconciled: boolean }>(reconciliation.body).allReconciled).toBe(true);
  });

  it('J8: minor asset loan requires guardian acceptance before checkout and restores stock on return', async () => {
    const category = await request(app.getHttpServer())
      .post('/api/v1/assets/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'P2 J8 Kits', ownerType: 'org', branchId: BRANCH_ID })
      .expect(201);
    const categoryId = dataOf<{ id: string }>(category.body).id;

    const asset = await request(app.getHttpServer())
      .post('/api/v1/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assetCode: 'P2-J8-KIT-001',
        name: 'P2 J8 Camp Kit',
        categoryId,
        quantity: 1,
        condition: 'good',
      })
      .expect(201);
    const assetId = dataOf<{ id: string }>(asset.body).id;

    const loan = await request(app.getHttpServer())
      .post('/api/v1/assets/loans')
      .set('Authorization', `Bearer ${childToken}`)
      .send({
        assetId,
        quantity: 1,
        borrowerId: CHILD_MEMBER_ID,
        purpose: 'P2 J8 camp kit loan',
        expectedReturn: '2026-06-15',
        isBorrowerMinor: true,
      })
      .expect(201);
    const loanId = dataOf<{ id: string; guardianAcceptanceStatus: string }>(loan.body).id;
    expect(dataOf<{ guardianAcceptanceStatus: string }>(loan.body).guardianAcceptanceStatus).toBe(
      'pending',
    );

    await transitionLoan(loanId, 'approve', 'approved');

    await request(app.getHttpServer())
      .post(`/api/v1/assets/loans/${loanId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'checkout' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/v1/assets/loans/${loanId}/guardian-accept`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ decision: 'accept', notes: 'Parent accepts responsibility' })
      .expect(201);

    await transitionLoan(loanId, 'checkout', 'checked_out');

    const checkedOutAsset = await request(app.getHttpServer())
      .get(`/api/v1/assets/${assetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(dataOf<{ availableQty: number }>(checkedOutAsset.body).availableQty).toBe(0);

    await transitionLoan(loanId, 'return', 'returned', {
      conditionOnReturn: 'good',
      returnNotes: 'Returned complete',
    });

    const returnedAsset = await request(app.getHttpServer())
      .get(`/api/v1/assets/${assetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(dataOf<{ availableQty: number }>(returnedAsset.body).availableQty).toBe(1);
  });

  it('J9: ticket approval request is approved, resolved, closed, and keeps status/audit trail', async () => {
    const ticket = await request(app.getHttpServer())
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${childToken}`)
      .send({
        title: 'P2 J9 Budget Approval Ticket',
        description: 'Request approval before closing operational issue',
        category: 'Tai chinh',
        priority: 'medium',
        tags: ['p2', 'j9'],
      })
      .expect(201);
    const ticketId = dataOf<{ id: string }>(ticket.body).id;

    const approval = await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/approval`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approvalType: 'budget', amount: 700000, notes: 'Needs manual approval' })
      .expect(201);
    expect(dataOf<{ approvalStatus: string }>(approval.body).approvalStatus).toBe('pending');

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'approve', notes: 'Approved for P2 smoke' })
      .expect(201);
    expect(dataOf<{ approvalStatus: string }>(approved.body).approvalStatus).toBe('approved');

    await transitionTicket(ticketId, 'assign', 'assigned', { assigneeId: ADMIN_USER_ID });
    await transitionTicket(ticketId, 'start', 'in_progress');
    await transitionTicket(ticketId, 'resolve', 'resolved', { approvalNotes: 'Work completed' });
    await transitionTicket(ticketId, 'close', 'closed');

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const ticketDetail = dataOf<{
      status: string;
      customFields: { approvalRequest?: { status: string } };
      statusHistory: Array<{ toStatus: string }>;
      comments: Array<{ isInternal: boolean; content: string }>;
    }>(detail.body);

    expect(ticketDetail.status).toBe('closed');
    expect(ticketDetail.customFields.approvalRequest?.status).toBe('approved');
    expect(ticketDetail.statusHistory.map((history) => history.toStatus)).toEqual([
      'open',
      'assigned',
      'in_progress',
      'resolved',
      'closed',
    ]);
    expect(ticketDetail.comments.some((comment) => comment.isInternal)).toBe(true);
  });

  async function createAndCompleteIncome(
    accountId: string,
    feeId: string,
    amount: number,
    referenceNo: string,
  ) {
    const tx = await request(app.getHttpServer())
      .post('/api/v1/finance/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        accountId,
        transactionType: 'income',
        category: 'fees',
        amount,
        description: `${referenceNo} fee payment`,
        sourceType: 'member_fee',
        sourceId: feeId,
        referenceNo,
        transactionDate: '2026-05-16',
      })
      .expect(201);
    const txId = dataOf<{ id: string }>(tx.body).id;

    await request(app.getHttpServer())
      .post(`/api/v1/finance/transactions/${txId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/finance/transactions/${txId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'complete' })
      .expect(201);

    return txId;
  }

  async function transitionLoan(
    loanId: string,
    action: string,
    expectedStatus: string,
    extra: Record<string, unknown> = {},
  ) {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/assets/loans/${loanId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action, ...extra })
      .expect(201);
    expect(dataOf<{ status: string }>(response.body).status).toBe(expectedStatus);
  }

  async function transitionTicket(
    ticketId: string,
    action: string,
    expectedStatus: string,
    extra: Record<string, unknown> = {},
  ) {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action, ...extra })
      .expect(201);
    expect(dataOf<{ status: string }>(response.body).status).toBe(expectedStatus);
  }

  async function waitForNotifications(eventType: string, recipientIds: string[]) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const notifications = await prisma.notification.findMany({
        where: { orgId: ORG_ID, type: eventType, recipientId: { in: recipientIds } },
        orderBy: { createdAt: 'asc' },
      });
      const found = new Set(notifications.map((notification) => notification.recipientId));
      if (recipientIds.every((recipientId) => found.has(recipientId))) return notifications;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return prisma.notification.findMany({
      where: { orgId: ORG_ID, type: eventType, recipientId: { in: recipientIds } },
      orderBy: { createdAt: 'asc' },
    });
  }
});

async function seedFixture(prisma: PrismaService) {
  await cleanupFixture(prisma);

  await prisma.organization.create({
    data: {
      id: ORG_ID,
      slug: 'ttndd-p2-j7-j9-critical',
      name: 'TTNDD P2 J7-J9 Critical',
      fullName: 'TTNDD P2 J7-J9 Critical Journey Fixture',
      isActive: true,
      settings: {
        enabledModules: ['FINANCE', 'ASSETS', 'TICKETS', 'NOTIFICATIONS'],
      },
    },
  });

  await prisma.branch.create({
    data: {
      id: BRANCH_ID,
      orgId: ORG_ID,
      code: 'P2-J789',
      name: 'P2 J7-J9 Branch',
      minAge: 6,
      maxAge: 18,
    },
  });

  await prisma.unit.create({
    data: {
      id: UNIT_ID,
      orgId: ORG_ID,
      branchId: BRANCH_ID,
      name: 'P2 J7-J9 Unit',
      unitType: 'patrol',
    },
  });

  await seedUser(prisma, ADMIN_USER_ID, ADMIN_FIREBASE_UID, ADMIN_EMAIL, 'P2 J789 Admin');
  await seedUser(prisma, PARENT_USER_ID, PARENT_FIREBASE_UID, PARENT_EMAIL, 'P2 J789 Parent');
  await seedUser(prisma, CHILD_USER_ID, CHILD_FIREBASE_UID, CHILD_EMAIL, 'P2 J789 Child');

  await seedMember(prisma, ADMIN_MEMBER_ID, ADMIN_USER_ID, 'admin', 'P2-J789-ADMIN');
  await seedMember(prisma, PARENT_MEMBER_ID, PARENT_USER_ID, 'parent', 'P2-J789-PARENT');
  await seedMember(
    prisma,
    CHILD_MEMBER_ID,
    CHILD_USER_ID,
    'user',
    'P2-J789-CHILD',
    PARENT_MEMBER_ID,
  );

  await prisma.memberProfile.create({
    data: {
      orgId: ORG_ID,
      orgMemberId: CHILD_MEMBER_ID,
      fullName: 'P2 J789 Child',
      birthDate: new Date('2015-05-01'),
      consentFormSigned: true,
      createdBy: ADMIN_USER_ID,
    },
  });

  await prisma.guardianLink.create({
    data: {
      orgId: ORG_ID,
      orgMemberId: CHILD_MEMBER_ID,
      fullName: 'P2 J789 Parent',
      relation: 'parent',
      email: PARENT_EMAIL,
      phone: '0900000789',
      isPrimary: true,
      consentSigned: true,
      consentDate: new Date('2026-05-16'),
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
  await prisma.ticketComment.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.ticketStatusHistory.deleteMany({
    where: { ticket: { orgId: ORG_ID } },
  });
  await prisma.ticket.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.assetLoan.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.assetCustomField.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.maintenanceSchedule.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.asset.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.assetCategory.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.memberFee.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.financialTransaction.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.financialAccount.deleteMany({ where: { orgId: ORG_ID } });
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
