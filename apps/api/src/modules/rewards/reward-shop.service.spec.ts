import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RewardShopService } from './reward-shop.service';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { ExpService } from './exp.service';
import { DOMAIN_EVENTS } from '@ttndd/constants';

describe('RewardShopService', () => {
  let service: RewardShopService;
  let prisma: {
    rewardItem: { findMany: jest.Mock; create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    rewardRedemption: { create: jest.Mock; update: jest.Mock; findMany: jest.Mock };
  };
  let domainEvents: { publish: jest.Mock };
  let expService: { deductExp: jest.Mock };

  beforeEach(async () => {
    prisma = {
      rewardItem: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      rewardRedemption: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    };
    domainEvents = { publish: jest.fn() };
    expService = { deductExp: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardShopService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainEventService, useValue: domainEvents },
        { provide: ExpService, useValue: expService },
      ],
    }).compile();

    service = module.get(RewardShopService);
  });

  describe('redeem', () => {
    it('should throw when item not found', async () => {
      prisma.rewardItem.findFirst.mockResolvedValue(null);
      await expect(service.redeem('org1', 'member1', 'item-missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw when item out of stock', async () => {
      prisma.rewardItem.findFirst.mockResolvedValue({
        id: 'item1',
        name: 'Badge',
        costExp: 10,
        quantityAvailable: 0,
        isActive: true,
      });
      await expect(service.redeem('org1', 'member1', 'item1')).rejects.toThrow(BadRequestException);
    });

    it('should emit REDEMPTION_REQUESTED event on successful redeem', async () => {
      prisma.rewardItem.findFirst.mockResolvedValue({
        id: 'item1',
        name: 'Badge',
        costExp: 10,
        quantityAvailable: 5,
        isActive: true,
      });
      prisma.rewardItem.update.mockResolvedValue({});
      prisma.rewardRedemption.create.mockResolvedValue({
        id: 'red1',
        orgMemberId: 'member1',
        rewardId: 'item1',
      });
      expService.deductExp.mockResolvedValue({});

      await service.redeem('org1', 'member1', 'item1');

      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: DOMAIN_EVENTS.REWARDS.REDEMPTION_REQUESTED,
          aggregateId: 'member1',
        }),
      );
    });
  });

  describe('approveRedemption', () => {
    it('should emit ITEM_REDEEMED event on approval', async () => {
      prisma.rewardRedemption.update.mockResolvedValue({
        id: 'red1',
        orgMemberId: 'member1',
        rewardId: 'item1',
      });

      await service.approveRedemption('org1', 'red1', 'admin1');

      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: DOMAIN_EVENTS.REWARDS.ITEM_REDEEMED,
        }),
      );
    });
  });
});
