import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { DOMAIN_EVENTS } from '@ttndd/constants';

@Injectable()
export class BadgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
  ) {}

  async getDefinitions(orgId: string) {
    return this.prisma.badgeDefinition.findMany({ where: { orgId }, orderBy: { name: 'asc' } });
  }

  async createDefinition(orgId: string, data: { badgeCode: string; name: string; description?: string; badgeType?: string; imageUrl: string; rarity?: string; triggerEvent?: string; triggerConfig?: Prisma.InputJsonValue; expReward?: number; isAutoAward?: boolean }) {
    return this.prisma.badgeDefinition.create({ data: { orgId, ...data } });
  }

  async updateDefinition(orgId: string, badgeId: string, data: Partial<{ name: string; description: string; imageUrl: string; rarity: string; triggerEvent: string; triggerConfig: Prisma.InputJsonValue; expReward: number; isAutoAward: boolean }>) {
    return this.prisma.badgeDefinition.update({ where: { id: badgeId }, data });
  }

  async awardBadge(orgId: string, memberId: string, badgeId: string, sourceEventId?: string, notes?: string, actorUserId?: string) {
    const badge = await this.prisma.badgeDefinition.findUnique({ where: { id: badgeId } });
    if (!badge) throw new NotFoundException('Badge definition not found');

    const existing = await this.prisma.memberBadge.findUnique({
      where: { orgMemberId_badgeId: { orgMemberId: memberId, badgeId } },
    });
    if (existing) return existing;

    const awarded = await this.prisma.memberBadge.create({
      data: { orgId, orgMemberId: memberId, badgeId, sourceEventId, notes },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.REWARDS.BADGE_AWARDED,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: { badgeId, badgeName: badge.name, rarity: badge.rarity },
      actorUserId: actorUserId || memberId,
    });

    return awarded;
  }

  async getMemberBadges(orgId: string, memberId: string) {
    return this.prisma.memberBadge.findMany({
      where: { orgId, orgMemberId: memberId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });
  }
}
