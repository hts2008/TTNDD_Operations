import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PenaltyService } from './penalty.service';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { ExpService } from './exp.service';
import { DOMAIN_EVENTS } from '@ttndd/constants';

describe('PenaltyService', () => {
  let service: PenaltyService;
  let prisma: {
    expTransaction: { findFirst: jest.Mock; update: jest.Mock };
    memberExpSummary: { update: jest.Mock };
  };
  let domainEvents: { publish: jest.Mock };
  let expService: { deductExp: jest.Mock; awardExp: jest.Mock };

  beforeEach(async () => {
    prisma = {
      expTransaction: { findFirst: jest.fn(), update: jest.fn() },
      memberExpSummary: { update: jest.fn() },
    };
    domainEvents = { publish: jest.fn() };
    expService = { deductExp: jest.fn(), awardExp: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PenaltyService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainEventService, useValue: domainEvents },
        { provide: ExpService, useValue: expService },
      ],
    }).compile();

    service = module.get(PenaltyService);
  });

  describe('applyPenalty', () => {
    it('should deduct EXP and emit PENALTY_APPLIED event', async () => {
      const mockTx = { id: 'tx1', orgMemberId: 'member1', expAmount: -10 };
      expService.deductExp.mockResolvedValue(mockTx);
      prisma.expTransaction.update.mockResolvedValue(mockTx);

      await service.applyPenalty('org1', 'member1', 10, 'Late', 'admin1', 'tardiness');

      expect(expService.deductExp).toHaveBeenCalledWith('org1', 'member1', 10, 'Late', 'admin1');
      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: DOMAIN_EVENTS.REWARDS.PENALTY_APPLIED,
          aggregateId: 'member1',
        }),
      );
    });

    it('should update transaction with deductionItem and correctionTask', async () => {
      const mockTx = { id: 'tx1' };
      expService.deductExp.mockResolvedValue(mockTx);
      prisma.expTransaction.update.mockResolvedValue(mockTx);

      await service.applyPenalty(
        'org1',
        'member1',
        5,
        'Violation',
        'admin1',
        'item1',
        'Write essay',
      );

      expect(prisma.expTransaction.update).toHaveBeenCalledWith({
        where: { id: 'tx1' },
        data: { deductionItem: 'item1', correctionTask: 'Write essay' },
      });
    });
  });

  describe('correctPenalty', () => {
    it('should reverse penalty and mark as corrected', async () => {
      prisma.expTransaction.findFirst.mockResolvedValue({
        id: 'tx1',
        orgMemberId: 'member1',
        expAmount: -10,
        transactionType: 'deduct',
        deductionReason: 'Late',
        isCorrected: false,
      });
      expService.awardExp.mockResolvedValue({});
      prisma.expTransaction.update.mockResolvedValue({});
      prisma.memberExpSummary.update.mockResolvedValue({});

      const result = await service.correctPenalty('org1', 'tx1', 'admin1');

      expect(result.corrected).toBe(true);
      expect(result.reversedAmount).toBe(10);
      expect(expService.awardExp).toHaveBeenCalledWith(
        'org1',
        'member1',
        10,
        'penalty_correction',
        'rewards',
        'tx1',
        'admin1',
        expect.any(String),
      );
      expect(prisma.expTransaction.update).toHaveBeenCalledWith({
        where: { id: 'tx1' },
        data: expect.objectContaining({ isCorrected: true }),
      });
      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: DOMAIN_EVENTS.REWARDS.PENALTY_CORRECTED }),
      );
    });

    it('should throw NotFoundException when penalty not found', async () => {
      prisma.expTransaction.findFirst.mockResolvedValue(null);
      await expect(service.correctPenalty('org1', 'tx-missing', 'admin1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for already corrected penalty', async () => {
      prisma.expTransaction.findFirst.mockResolvedValue({
        id: 'tx1',
        isCorrected: true,
        transactionType: 'deduct',
      });
      await expect(service.correctPenalty('org1', 'tx1', 'admin1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
