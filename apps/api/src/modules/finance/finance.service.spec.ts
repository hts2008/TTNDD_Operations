import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FinanceService } from './finance.service';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';

describe('FinanceService', () => {
  let service: FinanceService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let domainEvents: { publish: jest.Mock };
  let audit: { log: jest.Mock };

  const ORG_ID = 'org-fin-1';
  const USER_ID = 'user-fin-1';

  beforeEach(async () => {
    prisma = {
      financialAccount: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      financialTransaction: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      costCenter: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      feePlan: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      sponsor: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      ledgerEntry: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      memberFee: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    domainEvents = { publish: jest.fn().mockResolvedValue(undefined) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainEventService, useValue: domainEvents },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
  });

  // ── Accounts ──

  describe('createAccount', () => {
    it('should create account and log audit', async () => {
      const data = { name: 'Quỹ sinh hoạt' };
      prisma.financialAccount.create.mockResolvedValue({
        id: 'acc-1',
        orgId: ORG_ID,
        ...data,
        currentBalance: new Prisma.Decimal(0),
      });

      const result = await service.createAccount(ORG_ID, data, USER_ID);

      expect(result.id).toBe('acc-1');
      expect(prisma.financialAccount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ orgId: ORG_ID, name: 'Quỹ sinh hoạt' }),
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'finance.account_created',
          resource: 'FinancialAccount',
        }),
      );
    });
  });

  describe('getAccounts', () => {
    it('should paginate and filter accounts', async () => {
      prisma.financialAccount.findMany.mockResolvedValue([]);
      prisma.financialAccount.count.mockResolvedValue(5);

      const result = await service.getAccounts(ORG_ID, { accountType: 'cash' }, 2, 10);

      expect(result.meta).toEqual({ total: 5, page: 2, limit: 10 });
      expect(prisma.financialAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: ORG_ID, accountType: 'cash' },
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('getAccountById', () => {
    it('should throw NotFoundException when account not found', async () => {
      prisma.financialAccount.findFirst.mockResolvedValue(null);

      await expect(service.getAccountById(ORG_ID, 'no-exist')).rejects.toThrow(NotFoundException);
    });
  });

  describe('finance v2 master data', () => {
    it('should persist cost centers as first-class records', async () => {
      prisma.costCenter.create.mockResolvedValue({
        id: 'cc-1',
        orgId: ORG_ID,
        name: 'Training Camp',
        code: 'CAMP',
        parentId: null,
        budgetAmount: new Prisma.Decimal(15000000),
        spentAmount: new Prisma.Decimal(0),
        description: 'Annual camp',
        createdAt: new Date('2026-05-16T00:00:00Z'),
      });

      const result = await service.createCostCenter(
        ORG_ID,
        { name: 'Training Camp', code: 'CAMP', budgetAmount: 15000000, description: 'Annual camp' },
        USER_ID,
      );

      expect(result).toMatchObject({
        id: 'cc-1',
        name: 'Training Camp',
        budgetAmount: 15000000,
        spentAmount: 0,
      });
      expect(prisma.costCenter.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ orgId: ORG_ID, code: 'CAMP' }),
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'finance.cost_center_created', resource: 'CostCenter' }),
      );
    });

    it('should persist fee plans and sponsors outside organization settings', async () => {
      prisma.feePlan.create.mockResolvedValue({
        id: 'fp-1',
        name: 'Quarterly dues',
        frequency: 'quarterly',
        amount: new Prisma.Decimal(300000),
        feeType: 'dues',
        description: null,
        startDate: new Date('2026-06-01T00:00:00Z'),
        isActive: true,
        createdAt: new Date('2026-05-16T00:00:00Z'),
      });
      prisma.sponsor.create.mockResolvedValue({
        id: 'sp-1',
        name: 'Parent Board',
        contributionType: 'cash',
        amount: new Prisma.Decimal(7500000),
        description: null,
        receivedDate: new Date('2026-05-01T00:00:00Z'),
        contactInfo: 'board@example.com',
        createdAt: new Date('2026-05-16T00:00:00Z'),
      });

      const plan = await service.createFeePlan(
        ORG_ID,
        {
          name: 'Quarterly dues',
          frequency: 'quarterly',
          amount: 300000,
          feeType: 'dues',
          startDate: '2026-06-01',
        },
        USER_ID,
      );
      const sponsor = await service.createSponsor(
        ORG_ID,
        {
          name: 'Parent Board',
          contributionType: 'cash',
          amount: 7500000,
          receivedDate: '2026-05-01',
          contactInfo: 'board@example.com',
        },
        USER_ID,
      );

      expect(plan).toMatchObject({ id: 'fp-1', amount: 300000, isActive: true });
      expect(sponsor).toMatchObject({ id: 'sp-1', amount: 7500000, contributionType: 'cash' });
      expect(prisma.feePlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ orgId: ORG_ID, name: 'Quarterly dues' }),
      });
      expect(prisma.sponsor.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ orgId: ORG_ID, name: 'Parent Board' }),
      });
    });
  });

  // ── Transactions (SM-6) ──

  describe('createTransaction', () => {
    it('should create transaction on active account', async () => {
      prisma.financialAccount.findFirst.mockResolvedValue({
        id: 'acc-1',
        orgId: ORG_ID,
        isActive: true,
        transactions: [],
      });
      prisma.financialTransaction.create.mockResolvedValue({
        id: 'tx-1',
        orgId: ORG_ID,
        amount: new Prisma.Decimal(500000),
        transactionType: 'income',
        status: 'pending',
      });

      const data = {
        accountId: 'acc-1',
        transactionType: 'income',
        amount: 500000,
        description: 'Thu phí tháng 3',
        transactionDate: '2026-03-01',
      };
      const result = await service.createTransaction(ORG_ID, data, USER_ID);

      expect(result.id).toBe('tx-1');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'finance.transaction_created' }),
      );
    });

    it('should reject transaction on inactive account', async () => {
      prisma.financialAccount.findFirst.mockResolvedValue({
        id: 'acc-1',
        orgId: ORG_ID,
        isActive: false,
        transactions: [],
      });

      await expect(
        service.createTransaction(
          ORG_ID,
          {
            accountId: 'acc-1',
            transactionType: 'income',
            amount: 100000,
            description: 'Test',
            transactionDate: '2026-03-01',
          },
          USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transitionTransaction (SM-6)', () => {
    it('should approve a pending transaction', async () => {
      prisma.financialTransaction.findFirst.mockResolvedValue({
        id: 'tx-1',
        orgId: ORG_ID,
        status: 'pending',
        accountId: 'acc-1',
        amount: new Prisma.Decimal(100000),
        transactionType: 'income',
      });
      prisma.financialTransaction.update.mockResolvedValue({
        id: 'tx-1',
        status: 'approved',
        approvedBy: USER_ID,
      });

      const result = await service.transitionTransaction(ORG_ID, 'tx-1', 'approve', USER_ID);

      expect(result.status).toBe('approved');
      expect(prisma.financialTransaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: expect.objectContaining({ status: 'approved', approvedBy: USER_ID }),
      });
    });

    it('should complete an approved income — balance incremented', async () => {
      prisma.financialTransaction.findFirst.mockResolvedValue({
        id: 'tx-1',
        orgId: ORG_ID,
        status: 'approved',
        accountId: 'acc-1',
        amount: new Prisma.Decimal(500000),
        transactionType: 'income',
      });
      prisma.financialTransaction.update.mockResolvedValue({ id: 'tx-1', status: 'completed' });
      prisma.financialAccount.update.mockResolvedValue({});

      await service.transitionTransaction(ORG_ID, 'tx-1', 'complete', USER_ID);

      expect(prisma.financialAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { currentBalance: { increment: new Prisma.Decimal(500000) } },
      });
      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'finance.transaction_completed',
          aggregateId: 'tx-1',
        }),
      );
    });

    it('should reverse a completed transaction — balance rolled back', async () => {
      prisma.financialTransaction.findFirst.mockResolvedValue({
        id: 'tx-1',
        orgId: ORG_ID,
        status: 'completed',
        accountId: 'acc-1',
        amount: new Prisma.Decimal(300000),
        transactionType: 'income',
      });
      prisma.financialTransaction.update.mockResolvedValue({ id: 'tx-1', status: 'reversed' });
      prisma.financialAccount.update.mockResolvedValue({});

      await service.transitionTransaction(ORG_ID, 'tx-1', 'reverse', USER_ID);

      expect(prisma.financialAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { currentBalance: { increment: new Prisma.Decimal(-300000) } },
      });
    });

    it('should post balanced ledger entries behind FINANCE_DOUBLE_ENTRY flag', async () => {
      const previousFlag = process.env.FINANCE_DOUBLE_ENTRY;
      process.env.FINANCE_DOUBLE_ENTRY = 'true';
      prisma.financialTransaction.findFirst.mockResolvedValue({
        id: 'tx-2',
        orgId: ORG_ID,
        status: 'approved',
        accountId: 'acc-1',
        costCenterId: 'cc-1',
        amount: new Prisma.Decimal(125000),
        transactionType: 'expense',
        currency: 'VND',
        description: 'Buy supplies',
        sourceType: 'manual',
        sourceId: null,
      });
      prisma.financialTransaction.update.mockResolvedValue({ id: 'tx-2', status: 'completed' });
      prisma.financialAccount.update.mockResolvedValue({});
      prisma.costCenter.update.mockResolvedValue({});
      prisma.ledgerEntry.createMany.mockResolvedValue({ count: 2 });

      try {
        await service.transitionTransaction(ORG_ID, 'tx-2', 'complete', USER_ID);
      } finally {
        if (previousFlag === undefined) {
          delete process.env.FINANCE_DOUBLE_ENTRY;
        } else {
          process.env.FINANCE_DOUBLE_ENTRY = previousFlag;
        }
      }

      expect(prisma.costCenter.update).toHaveBeenCalledWith({
        where: { id: 'cc-1' },
        data: { spentAmount: { increment: new Prisma.Decimal(125000) } },
      });
      expect(prisma.ledgerEntry.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            postingKey: 'tx-2:complete',
            entryType: 'credit',
            ledgerAccount: 'cash',
            amount: new Prisma.Decimal(125000),
          }),
          expect.objectContaining({
            postingKey: 'tx-2:complete',
            entryType: 'debit',
            ledgerAccount: 'expense',
            amount: new Prisma.Decimal(125000),
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should reject invalid SM-6 transition', async () => {
      prisma.financialTransaction.findFirst.mockResolvedValue({
        id: 'tx-1',
        orgId: ORG_ID,
        status: 'pending',
        accountId: 'acc-1',
        amount: new Prisma.Decimal(100000),
        transactionType: 'expense',
      });

      await expect(
        service.transitionTransaction(ORG_ID, 'tx-1', 'complete', USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for missing transaction', async () => {
      prisma.financialTransaction.findFirst.mockResolvedValue(null);

      await expect(
        service.transitionTransaction(ORG_ID, 'no-exist', 'approve', USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Fees (SM-7) ──

  describe('createFee', () => {
    it('should create fee and publish event', async () => {
      const data = {
        orgMemberId: 'member-1',
        feeType: 'monthly',
        amountDue: 300000,
        feePeriod: 'Q1/2026',
      };
      prisma.memberFee.create.mockResolvedValue({
        id: 'fee-1',
        orgId: ORG_ID,
        ...data,
        amountPaid: new Prisma.Decimal(0),
        status: 'unpaid',
      });

      const result = await service.createFee(ORG_ID, data, USER_ID);

      expect(result.id).toBe('fee-1');
      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'finance.fee_created',
          aggregateType: 'MemberFee',
          payload: expect.objectContaining({ memberId: 'member-1' }),
        }),
      );
    });
  });

  describe('payFee (SM-7)', () => {
    it('should pay partial — status becomes partial', async () => {
      prisma.memberFee.findFirst.mockResolvedValue({
        id: 'fee-1',
        orgId: ORG_ID,
        status: 'unpaid',
        amountDue: new Prisma.Decimal(300000),
        amountPaid: new Prisma.Decimal(0),
        orgMemberId: 'member-1',
      });
      prisma.memberFee.update.mockResolvedValue({
        id: 'fee-1',
        status: 'partial',
        amountPaid: new Prisma.Decimal(100000),
      });

      const result = await service.payFee(ORG_ID, 'fee-1', 100000, undefined, USER_ID);

      expect(result.status).toBe('partial');
      expect(prisma.memberFee.update).toHaveBeenCalledWith({
        where: { id: 'fee-1' },
        data: expect.objectContaining({
          amountPaid: new Prisma.Decimal(100000),
          status: 'partial',
        }),
      });
    });

    it('should pay full — status becomes paid + event published', async () => {
      prisma.memberFee.findFirst.mockResolvedValue({
        id: 'fee-1',
        orgId: ORG_ID,
        status: 'unpaid',
        amountDue: new Prisma.Decimal(300000),
        amountPaid: new Prisma.Decimal(0),
        orgMemberId: 'member-1',
      });
      prisma.memberFee.update.mockResolvedValue({
        id: 'fee-1',
        status: 'paid',
        paidDate: new Date(),
        amountPaid: new Prisma.Decimal(300000),
      });

      const result = await service.payFee(ORG_ID, 'fee-1', 300000, 'tx-link', USER_ID);

      expect(result.status).toBe('paid');
      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'finance.fee_paid' }),
      );
    });

    it('should reject payment on a paid fee', async () => {
      prisma.memberFee.findFirst.mockResolvedValue({
        id: 'fee-1',
        orgId: ORG_ID,
        status: 'paid',
        amountDue: new Prisma.Decimal(300000),
        amountPaid: new Prisma.Decimal(300000),
        orgMemberId: 'member-1',
      });

      await expect(service.payFee(ORG_ID, 'fee-1', 100000, undefined, USER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for missing fee', async () => {
      prisma.memberFee.findFirst.mockResolvedValue(null);

      await expect(service.payFee(ORG_ID, 'no-exist', 100000, undefined, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findFees', () => {
    it('should paginate fees with filters', async () => {
      prisma.memberFee.findMany.mockResolvedValue([]);
      prisma.memberFee.count.mockResolvedValue(10);

      const result = await service.findFees(ORG_ID, { status: 'unpaid' }, 1, 5);

      expect(result.meta).toEqual({ total: 10, page: 1, limit: 5 });
      expect(prisma.memberFee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: ORG_ID, status: 'unpaid' },
          skip: 0,
          take: 5,
        }),
      );
    });
  });

  // ── Reports ──

  describe('getFinanceSummary', () => {
    it('should aggregate income and expense by category', async () => {
      prisma.financialTransaction.findMany.mockResolvedValue([
        {
          amount: new Prisma.Decimal(500000),
          transactionType: 'income',
          category: 'Phí sinh hoạt',
        },
        { amount: new Prisma.Decimal(200000), transactionType: 'expense', category: 'Vật tư' },
        {
          amount: new Prisma.Decimal(100000),
          transactionType: 'income',
          category: 'Phí sinh hoạt',
        },
      ]);

      const result = await service.getFinanceSummary(ORG_ID);

      expect(result.totals.income).toBe(600000);
      expect(result.totals.expense).toBe(200000);
      expect(result.totals.net).toBe(400000);
      expect(result.byCategory['Phí sinh hoạt'].income).toBe(600000);
      expect(result.byCategory['Vật tư'].expense).toBe(200000);
    });
  });

  describe('getMemberFees', () => {
    it('should return fees with summary totals', async () => {
      prisma.memberFee.findMany.mockResolvedValue([
        { amountDue: new Prisma.Decimal(300000), amountPaid: new Prisma.Decimal(300000) },
        { amountDue: new Prisma.Decimal(300000), amountPaid: new Prisma.Decimal(0) },
      ]);

      const result = await service.getMemberFees(ORG_ID, 'member-1');

      expect(result.summary.totalDue).toBe(600000);
      expect(result.summary.totalPaid).toBe(300000);
      expect(result.summary.outstanding).toBe(300000);
    });
  });

  describe('ledger reporting and reconciliation', () => {
    it('should return balanced ledger totals', async () => {
      prisma.ledgerEntry.findMany.mockResolvedValue([
        {
          id: 'le-1',
          entryType: 'debit',
          amount: new Prisma.Decimal(100000),
          createdAt: new Date(),
        },
        {
          id: 'le-2',
          entryType: 'credit',
          amount: new Prisma.Decimal(100000),
          createdAt: new Date(),
        },
      ]);

      const result = await service.getLedgerEntries(ORG_ID, { transactionId: 'tx-1' });

      expect(result.meta.totals).toEqual({ debit: 100000, credit: 100000, balanced: true });
      expect(result.data[0]!.amount).toBe(100000);
      expect(prisma.ledgerEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: ORG_ID, transactionId: 'tx-1' },
        }),
      );
    });

    it('should reconcile account balances to both transactions and ledger entries', async () => {
      prisma.financialAccount.findMany.mockResolvedValue([
        { id: 'acc-1', name: 'Cash', currentBalance: new Prisma.Decimal(500000), isActive: true },
      ]);
      prisma.financialTransaction.findMany.mockResolvedValue([
        { transactionType: 'income', amount: new Prisma.Decimal(500000) },
      ]);
      prisma.ledgerEntry.findMany.mockResolvedValue([
        { entryType: 'debit', amount: new Prisma.Decimal(500000) },
      ]);

      const result = await service.reconcileBalances(ORG_ID);

      expect(result.accounts[0]).toMatchObject({
        accountId: 'acc-1',
        storedBalance: 500000,
        calculatedBalance: 500000,
        ledgerBalance: 500000,
        isReconciled: true,
        isLedgerReconciled: true,
      });
      expect(result.allLedgerReconciled).toBe(true);
    });
  });
});
