import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { CapCounterService } from './cap-counter.service';
import { DOMAIN_EVENTS } from '@ttndd/constants';

@Injectable()
export class ExpService {
  private readonly logger = new Logger(ExpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly capCounter: CapCounterService,
  ) {}

  // ── EXP Config CRUD ──

  async getConfigs(orgId: string) {
    return this.prisma.expConfig.findMany({ where: { orgId }, orderBy: { sourceModule: 'asc' } });
  }

  async upsertConfig(
    orgId: string,
    data: {
      eventType: string;
      sourceModule: string;
      actionName: string;
      expAmount: number;
      maxPerDay?: number;
      maxPerWeek?: number;
      description?: string;
    },
  ) {
    return this.prisma.expConfig.upsert({
      where: { orgId_eventType: { orgId, eventType: data.eventType } },
      create: { orgId, ...data },
      update: data,
    });
  }

  // ── Award / Deduct EXP ──

  async awardExp(
    orgId: string,
    memberId: string,
    amount: number,
    eventType: string,
    sourceModule: string,
    sourceEntityId?: string,
    recordedBy?: string,
    notes?: string,
  ) {
    if (amount <= 0) throw new BadRequestException('EXP amount must be positive');

    // G2: Check daily/weekly cap before awarding
    const cap = await this.capCounter.canAward(orgId, memberId, eventType);
    if (!cap.allowed) {
      this.logger.debug(`Cap blocked: ${cap.reason}`);
      return null;
    }

    const summary = await this.getOrCreateSummary(orgId, memberId);
    const newTotal = summary.totalExp + amount;
    const newAvailable = summary.availableExp + amount;

    const [tx] = await this.prisma.$transaction([
      this.prisma.expTransaction.create({
        data: {
          orgId,
          orgMemberId: memberId,
          transactionType: 'earn',
          expAmount: amount,
          eventType,
          sourceModule,
          sourceEntityId,
          balanceAfter: newAvailable,
          recordedBy,
          notes,
        },
      }),
      this.prisma.memberExpSummary.update({
        where: { orgMemberId: memberId },
        data: { totalExp: newTotal, availableExp: newAvailable },
      }),
    ]);

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.REWARDS.EXP_AWARDED,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: { amount, newTotal, eventType: eventType as Prisma.InputJsonValue },
      actorUserId: recordedBy || memberId,
    });

    this.logger.debug(`EXP +${amount} → member ${memberId} (total: ${newTotal})`);
    return tx;
  }

  async deductExp(
    orgId: string,
    memberId: string,
    amount: number,
    reason: string,
    recordedBy: string,
  ) {
    if (amount <= 0) throw new BadRequestException('Deduction amount must be positive');

    const summary = await this.getOrCreateSummary(orgId, memberId);
    if (summary.availableExp < amount) {
      throw new BadRequestException(
        `Insufficient EXP: has ${summary.availableExp}, need ${amount}`,
      );
    }

    const newAvailable = summary.availableExp - amount;

    const [tx] = await this.prisma.$transaction([
      this.prisma.expTransaction.create({
        data: {
          orgId,
          orgMemberId: memberId,
          transactionType: 'deduct',
          expAmount: -amount,
          deductionReason: reason,
          balanceAfter: newAvailable,
          recordedBy,
        },
      }),
      this.prisma.memberExpSummary.update({
        where: { orgMemberId: memberId },
        data: { availableExp: newAvailable, penaltyCount: { increment: 1 } },
      }),
    ]);

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.REWARDS.EXP_DEDUCTED,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: { amount, reason, newAvailable },
      actorUserId: recordedBy,
    });

    return tx;
  }

  // ── Summary ──

  async getSummary(orgId: string, memberId: string) {
    return this.getOrCreateSummary(orgId, memberId);
  }

  async getTransactions(orgId: string, memberId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.expTransaction.findMany({
        where: { orgId, orgMemberId: memberId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expTransaction.count({ where: { orgId, orgMemberId: memberId } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  // ── Leaderboard ──

  async getLeaderboard(orgId: string, scope = 'org', limit = 20) {
    return this.prisma.memberExpSummary.findMany({
      where: { orgId },
      include: {
        orgMember: {
          select: {
            scoutName: true,
            heroName: true,
            memberCode: true,
            user: { select: { displayName: true, avatarUrl: true } },
            branch: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { totalExp: 'desc' },
      take: limit,
    });
  }

  private async getOrCreateSummary(orgId: string, memberId: string) {
    let summary = await this.prisma.memberExpSummary.findUnique({
      where: { orgMemberId: memberId },
    });
    if (!summary) {
      summary = await this.prisma.memberExpSummary.create({
        data: { orgId, orgMemberId: memberId },
      });
    }
    return summary;
  }
}
