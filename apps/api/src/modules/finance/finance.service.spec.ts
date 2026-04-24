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
        id: 'acc-1', orgId: ORG_ID, ...data, currentBalance: new Prisma.Decimal(0),
      });

      const result = await service.createAccount(ORG_ID, data, USER_ID);

      expect(result.id).toBe('acc-1');
      expect(prisma.financialAccount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ orgId: ORG_ID, name: 'Quỹ sinh hoạt' }),
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'finance.account_created', resource: 'FinancialAccount' }),
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

  // ── Transactions (SM-6) ──

  describe('createTransaction', () => {
    it('should create transaction on active account', async () => {
      prisma.financialAccount.findFirst.mockResolvedValue({
        id: 'acc-1', orgId: ORG_ID, isActive: true,
        transactions: [],
      });
      prisma.financialTransaction.create.mockResolvedValue({
        id: 'tx-1', orgId: ORG_ID, amount: new Prisma.Decimal(500000),
        transactionType: 'income', status: 'pending',
      });

      const data = {
        accountId: 'acc-1', transactionType: 'income',
        amount: 500000, description: 'Thu phí tháng 3',
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
        id: 'acc-1', orgId: ORG_ID, isActive: false,
        transactions: [],
      });

      await expect(
        service.createTransaction(ORG_ID, {
          accountId: 'acc-1', transactionType: 'income',
          amount: 100000, description: 'Test',
          transactionDate: '2026-03-01',
        }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transitionTransaction (SM-6)', () => {
    it('should approve a pending transaction', async () => {
      prisma.financialTransaction.findFirst.mockResolvedValue({
        id: 'tx-1', orgId: ORG_ID, status: 'pending',
        accountId: 'acc-1', amount: new Prisma.Decimal(100000),
        transactionType: 'income',
      });
      prisma.financialTransaction.update.mockResolvedValue({
        id: 'tx-1', status: 'approved', approvedBy: USER_ID,
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
        id: 'tx-1', orgId: ORG_ID, status: 'approved',
        accountId: 'acc-1', amount: new Prisma.Decimal(500000),
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
        id: 'tx-1', orgId: ORG_ID, status: 'completed',
        accountId: 'acc-1', amount: new Prisma.Decimal(300000),
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

    it('should reject invalid SM-6 transition', async () => {
      prisma.financialTransaction.findFirst.mockResolvedValue({
        id: 'tx-1', orgId: ORG_ID, status: 'pending',
        accountId: 'acc-1', amount: new Prisma.Decimal(100000),
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
        orgMemberId: 'member-1', feeType: 'monthly',
        amountDue: 300000, feePeriod: 'Q1/2026',
      };
      prisma.memberFee.create.mockResolvedValue({
        id: 'fee-1', orgId: ORG_ID, ...data,
        amountPaid: new Prisma.Decimal(0), status: 'unpaid',
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
        id: 'fee-1', orgId: ORG_ID, status: 'unpaid',
        amountDue: new Prisma.Decimal(300000),
        amountPaid: new Prisma.Decimal(0),
        orgMemberId: 'member-1',
      });
      prisma.memberFee.update.mockResolvedValue({
        id: 'fee-1', status: 'partial',
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
        id: 'fee-1', orgId: ORG_ID, status: 'unpaid',
        amountDue: new Prisma.Decimal(300000),
        amountPaid: new Prisma.Decimal(0),
        orgMemberId: 'member-1',
      });
      prisma.memberFee.update.mockResolvedValue({
        id: 'fee-1', status: 'paid', paidDate: new Date(),
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
        id: 'fee-1', orgId: ORG_ID, status: 'paid',
        amountDue: new Prisma.Decimal(300000),
        amountPaid: new Prisma.Decimal(300000),
        orgMemberId: 'member-1',
      });

      await expect(
        service.payFee(ORG_ID, 'fee-1', 100000, undefined, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for missing fee', async () => {
      prisma.memberFee.findFirst.mockResolvedValue(null);

      await expect(
        service.payFee(ORG_ID, 'no-exist', 100000, undefined, USER_ID),
      ).rejects.toThrow(NotFoundException);
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
        { amount: new Prisma.Decimal(500000), transactionType: 'income', category: 'Phí sinh hoạt' },
        { amount: new Prisma.Decimal(200000), transactionType: 'expense', category: 'Vật tư' },
        { amount: new Prisma.Decimal(100000), transactionType: 'income', category: 'Phí sinh hoạt' },
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
});
