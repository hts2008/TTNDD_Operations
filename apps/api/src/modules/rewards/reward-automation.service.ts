import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { BadgeService } from './badge.service';
import { ExpService } from './exp.service';

interface RewardAutomationEvent {
  orgId: string;
  eventType: string;
  memberId: string;
  sourceModule: string;
  sourceEntityId?: string;
  sourceEventId?: string;
  defaultExp: number;
  payload?: Record<string, unknown>;
  actorUserId?: string;
}

@Injectable()
export class RewardAutomationService {
  private readonly logger = new Logger(RewardAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly expService: ExpService,
    private readonly badgeService: BadgeService,
  ) {}

  async processEvent(event: RewardAutomationEvent) {
    const expAmount = await this.resolveExpAmount(event);
    const expTransaction =
      expAmount > 0
        ? await this.expService.awardExp(
            event.orgId,
            event.memberId,
            expAmount,
            event.eventType,
            event.sourceModule,
            event.sourceEntityId,
            event.actorUserId,
            `auto:${event.eventType}`,
          )
        : null;

    const badgeDefinitions = await this.prisma.badgeDefinition.findMany({
      where: {
        orgId: event.orgId,
        triggerEvent: event.eventType,
        isAutoAward: true,
      },
    });

    let badgesAwarded = 0;
    for (const badge of badgeDefinitions) {
      if (!this.matchesTriggerConfig(badge.triggerConfig, event.payload ?? {})) {
        continue;
      }

      const awarded = await this.badgeService.awardBadge(
        event.orgId,
        event.memberId,
        badge.id,
        event.sourceEventId,
        `auto:${event.eventType}`,
        event.actorUserId,
      );
      if (awarded) badgesAwarded += 1;
    }

    this.logger.debug(
      `Reward automation processed ${event.eventType}: exp=${expAmount}, badges=${badgesAwarded}`,
    );

    return {
      expAmount,
      expAwarded: Boolean(expTransaction),
      badgesAwarded,
    };
  }

  private async resolveExpAmount(event: RewardAutomationEvent) {
    const config = await this.prisma.expConfig.findUnique({
      where: { orgId_eventType: { orgId: event.orgId, eventType: event.eventType } },
    });

    if (config && !config.isActive) {
      return 0;
    }

    return config?.expAmount ?? event.defaultExp;
  }

  private matchesTriggerConfig(config: Prisma.JsonValue, payload: Record<string, unknown>) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return true;
    }

    const entries = Object.entries(config as Record<string, unknown>);
    if (entries.length === 0) {
      return true;
    }

    return entries.every(([key, expected]) => payload[key] === expected);
  }
}
