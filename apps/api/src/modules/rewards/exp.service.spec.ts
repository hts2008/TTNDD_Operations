import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ExpService } from './exp.service';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { CapCounterService } from './cap-counter.service';
import { DOMAIN_EVENTS } from '@ttndd/constants';

describe('ExpService', () => {
  let service: ExpService;
  let prisma: {
    expConfig: { findMany: jest.Mock; upsert: jest.Mock };
    expTransaction: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    memberExpSummary: {
      findUnique: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let domainEvents: { publish: jest.Mock };
  let capCounter: { canAward: jest.Mock };

  beforeEach(async () => {
    prisma = {
      expConfig: { findMany: jest.fn(), upsert: jest.fn() },
      expTransaction: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      memberExpSummary: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    domainEvents = { publish: jest.fn() };
    capCounter = { canAward: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainEventService, useValue: domainEvents },
        { provide: CapCounterService, useValue: capCounter },
      ],
    }).compile();

    service = module.get(ExpService);
  });

  describe('awardExp', () => {
    it('should reject non-positive amount', async () => {
      await expect(service.awardExp('org1', 'member1', 0, 'test', 'test')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return null when cap is reached', async () => {
      capCounter.canAward.mockResolvedValue({ allowed: false, reason: 'Daily cap reached' });
      const result = await service.awardExp('org1', 'member1', 10, 'attendance', 'session');
      expect(result).toBeNull();
    });

    it('should award EXP and emit event when cap allows', async () => {
      capCounter.canAward.mockResolvedValue({ allowed: true });
      prisma.memberExpSummary.findUnique.mockResolvedValue(null);
      prisma.memberExpSummary.create.mockResolvedValue({ totalExp: 0, availableExp: 0 });
      prisma.$transaction.mockResolvedValue([{ id: 'tx1', expAmount: 10 }, {}]);
      prisma.expTransaction.create.mockResolvedValue({ id: 'tx1', expAmount: 10 });
      prisma.memberExpSummary.update.mockResolvedValue({});

      await service.awardExp('org1', 'member1', 10, 'manual_award', 'admin');

      expect(prisma.expTransaction.create).toHaveBeenCalled();
      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: DOMAIN_EVENTS.REWARDS.EXP_AWARDED,
          actorUserId: undefined,
        }),
      );
    });

    it('should return existing earn transaction for the same event source', async () => {
      prisma.expTransaction.findFirst.mockResolvedValue({ id: 'existing-tx', expAmount: 10 });

      const result = await service.awardExp(
        'org1',
        'member1',
        10,
        'session.attendance_marked',
        'session',
        '00000000-0000-4000-8000-000000000001',
      );

      expect(result).toEqual({ id: 'existing-tx', expAmount: 10 });
      expect(capCounter.canAward).not.toHaveBeenCalled();
      expect(prisma.expTransaction.create).not.toHaveBeenCalled();
      expect(domainEvents.publish).not.toHaveBeenCalled();
    });
  });

  describe('getTransactions', () => {
    it('should default invalid pagination to safe values', async () => {
      prisma.expTransaction.findMany.mockResolvedValue([]);
      prisma.expTransaction.count.mockResolvedValue(0);

      const result = await service.getTransactions('org1', 'member1', Number.NaN, Number.NaN);

      expect(prisma.expTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(result.meta).toEqual({ total: 0, page: 1, limit: 20 });
    });
  });

  describe('deductExp', () => {
    it('should reject when insufficient balance', async () => {
      prisma.memberExpSummary.findUnique.mockResolvedValue({ availableExp: 5 });
      await expect(service.deductExp('org1', 'member1', 10, 'penalty', 'admin1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should emit EXP_DEDUCTED event on deduction', async () => {
      prisma.memberExpSummary.findUnique.mockResolvedValue({
        orgMemberId: 'member1',
        totalExp: 100,
        availableExp: 100,
        penaltyCount: 0,
      });
      prisma.$transaction.mockImplementation(async (args: unknown[]) =>
        args.map(() => ({ id: 'tx1' })),
      );
      prisma.expTransaction.create.mockResolvedValue({ id: 'tx1', expAmount: -10 });
      prisma.memberExpSummary.update.mockResolvedValue({});

      await service.deductExp('org1', 'member1', 10, 'violation', 'admin1');

      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: DOMAIN_EVENTS.REWARDS.EXP_DEDUCTED,
        }),
      );
    });
  });
});
