import { Test, TestingModule } from '@nestjs/testing';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import { PrismaService } from '../../core/database';
import { BadgeService } from './badge.service';
import { ExpService } from './exp.service';
import { RewardAutomationService } from './reward-automation.service';

describe('RewardAutomationService', () => {
  let service: RewardAutomationService;
  let prisma: {
    expConfig: { findUnique: jest.Mock };
    badgeDefinition: { findMany: jest.Mock };
  };
  let expService: { awardExp: jest.Mock };
  let badgeService: { awardBadge: jest.Mock };

  beforeEach(async () => {
    prisma = {
      expConfig: { findUnique: jest.fn().mockResolvedValue(null) },
      badgeDefinition: { findMany: jest.fn().mockResolvedValue([]) },
    };
    expService = { awardExp: jest.fn().mockResolvedValue({ id: 'tx-1' }) };
    badgeService = { awardBadge: jest.fn().mockResolvedValue({ id: 'badge-1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardAutomationService,
        { provide: PrismaService, useValue: prisma },
        { provide: ExpService, useValue: expService },
        { provide: BadgeService, useValue: badgeService },
      ],
    }).compile();

    service = module.get(RewardAutomationService);
  });

  it('uses active ExpConfig amount before default EXP', async () => {
    prisma.expConfig.findUnique.mockResolvedValue({ isActive: true, expAmount: 25 });

    const result = await service.processEvent({
      orgId: 'org-1',
      eventType: DOMAIN_EVENTS.SESSION.ATTENDANCE_MARKED,
      memberId: 'member-1',
      sourceModule: 'session',
      sourceEntityId: 'session-1',
      defaultExp: 5,
    });

    expect(result).toEqual({ expAmount: 25, expAwarded: true, badgesAwarded: 0 });
    expect(expService.awardExp).toHaveBeenCalledWith(
      'org-1',
      'member-1',
      25,
      DOMAIN_EVENTS.SESSION.ATTENDANCE_MARKED,
      'session',
      'session-1',
      undefined,
      `auto:${DOMAIN_EVENTS.SESSION.ATTENDANCE_MARKED}`,
    );
  });

  it('skips inactive ExpConfig and awards matching auto badges', async () => {
    prisma.expConfig.findUnique.mockResolvedValue({ isActive: false, expAmount: 25 });
    prisma.badgeDefinition.findMany.mockResolvedValue([
      { id: 'badge-match', triggerConfig: { result: 'passed' } },
      { id: 'badge-miss', triggerConfig: { result: 'failed' } },
    ]);

    const result = await service.processEvent({
      orgId: 'org-1',
      eventType: DOMAIN_EVENTS.LMS.QUIZ_PASSED,
      memberId: 'member-1',
      sourceModule: 'lms',
      sourceEntityId: 'quiz-1',
      sourceEventId: 'event-1',
      defaultExp: 15,
      payload: { result: 'passed' },
      actorUserId: 'mentor-1',
    });

    expect(result).toEqual({ expAmount: 0, expAwarded: false, badgesAwarded: 1 });
    expect(expService.awardExp).not.toHaveBeenCalled();
    expect(badgeService.awardBadge).toHaveBeenCalledWith(
      'org-1',
      'member-1',
      'badge-match',
      'event-1',
      `auto:${DOMAIN_EVENTS.LMS.QUIZ_PASSED}`,
      'mentor-1',
    );
    expect(badgeService.awardBadge).toHaveBeenCalledTimes(1);
  });
});
