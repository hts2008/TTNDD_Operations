import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { ExpService } from './exp.service';
import { DOMAIN_EVENTS } from '@ttndd/constants';

const RECOGNITION_CATEGORIES = [
  'teamwork',
  'leadership',
  'helpfulness',
  'creativity',
  'bravery',
] as const;
const MAX_RECOGNITIONS_PER_DAY = 3;
const RECOGNITION_EXP_REWARD = 2;

@Injectable()
export class PeerRecognitionService {
  private readonly logger = new Logger(PeerRecognitionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly expService: ExpService,
  ) {}

  /**
   * Give a peer recognition (kudos) to another member.
   */
  async give(
    orgId: string,
    fromMemberId: string,
    toMemberId: string,
    category: string,
    message?: string,
  ) {
    if (fromMemberId === toMemberId) {
      throw new BadRequestException('Cannot recognize yourself');
    }

    if (!RECOGNITION_CATEGORIES.includes(category as (typeof RECOGNITION_CATEGORIES)[number])) {
      throw new BadRequestException(
        `Invalid category. Must be one of: ${RECOGNITION_CATEGORIES.join(', ')}`,
      );
    }

    // Check daily limit for giver
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCount = await this.prisma.peerRecognition.count({
      where: {
        orgId,
        fromMember: fromMemberId,
        createdAt: { gte: startOfDay },
      },
    });

    if (todayCount >= MAX_RECOGNITIONS_PER_DAY) {
      throw new BadRequestException(
        `Daily recognition limit reached (${MAX_RECOGNITIONS_PER_DAY}/day)`,
      );
    }

    const recognition = await this.prisma.peerRecognition.create({
      data: {
        orgId,
        fromMember: fromMemberId,
        toMember: toMemberId,
        category,
        message,
        expAwarded: RECOGNITION_EXP_REWARD,
      },
    });

    // Award small EXP to recipient
    try {
      await this.expService.awardExp(
        orgId,
        toMemberId,
        RECOGNITION_EXP_REWARD,
        'peer_recognition',
        'rewards',
        recognition.id,
        fromMemberId,
        `Peer recognition: ${category}`,
      );
    } catch (e) {
      this.logger.warn(`Failed to award peer recognition EXP: ${(e as Error).message}`);
    }

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.REWARDS.PEER_RECOGNIZED,
      aggregateId: toMemberId,
      aggregateType: 'OrgMember',
      payload: { fromMemberId, category, message, expAwarded: RECOGNITION_EXP_REWARD },
      actorUserId: fromMemberId,
    });

    this.logger.debug(`Peer recognition: ${fromMemberId} → ${toMemberId} (${category})`);
    return recognition;
  }

  /**
   * Get recognitions received by a member.
   */
  async getReceived(orgId: string, memberId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.peerRecognition.findMany({
        where: { orgId, toMember: memberId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.peerRecognition.count({ where: { orgId, toMember: memberId } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  /**
   * Get recognitions given by a member.
   */
  async getGiven(orgId: string, memberId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.peerRecognition.findMany({
        where: { orgId, fromMember: memberId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.peerRecognition.count({ where: { orgId, fromMember: memberId } }),
    ]);
    return { data, meta: { total, page, limit } };
  }
}
