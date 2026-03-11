import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import { RankProgressionService } from './rank-progression.service';

@Injectable()
export class ScoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
    private readonly progression: RankProgressionService,
  ) {}

  // ── Program Versions ──

  async getProgramVersions(orgId: string) {
    return this.prisma.programVersion.findMany({
      where: { orgId },
      include: { _count: { select: { ranks: true, domains: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProgramVersion(orgId: string, data: { versionName: string; status?: string; effectiveFrom?: Date; effectiveTo?: Date; notes?: string }) {
    return this.prisma.programVersion.create({ data: { orgId, ...data } });
  }

  // ── Domains ──

  async getDomains(orgId: string, versionId?: string) {
    const where: Prisma.DomainWhereInput = { orgId };
    if (versionId) where.versionId = versionId;
    return this.prisma.domain.findMany({
      where,
      include: { skills: { select: { id: true, name: true, skillCode: true } } },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async createDomain(orgId: string, data: { code: string; name: string; versionId?: string; branchId?: string; description?: string; spicesTags?: string[]; orderIndex?: number }) {
    return this.prisma.domain.create({ data: { orgId, ...data } });
  }

  // ── Skill Criteria ──

  async getSkillCriteria(orgId: string, skillId: string) {
    return this.prisma.skillCriteria.findMany({
      where: { orgId, skillId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async createSkillCriteria(orgId: string, data: { skillId: string; metricType: string; text: string; targetValue?: string; unit?: string; orderIndex?: number }) {
    return this.prisma.skillCriteria.create({ data: { orgId, ...data } });
  }

  // ── Rank Definitions ──

  async getRankDefinitions(orgId: string, branchId?: string) {
    const where: Prisma.RankDefinitionWhereInput = { orgId };
    if (branchId) where.branchId = branchId;
    return this.prisma.rankDefinition.findMany({ where, orderBy: { rankOrder: 'asc' } });
  }

  async createRankDefinition(orgId: string, data: { branchId: string; rankCode: string; rankName: string; narrativeName?: string; rankOrder: number; description?: string; iconUrl?: string; badgeImageUrl?: string; minExp?: number }) {
    return this.prisma.rankDefinition.create({ data: { orgId, ...data } });
  }

  // ── Skill Groups & Skills ──

  async getSkillGroups(orgId: string, branchId?: string) {
    const where: Prisma.SkillGroupWhereInput = { orgId };
    if (branchId) where.branchId = branchId;
    return this.prisma.skillGroup.findMany({
      where,
      include: { skills: { orderBy: { skillCode: 'asc' } } },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async createSkillGroup(orgId: string, data: { name: string; branchId?: string; narrativeName?: string; description?: string; icon?: string; color?: string; orderIndex?: number }) {
    return this.prisma.skillGroup.create({ data: { orgId, ...data } });
  }

  async createSkill(orgId: string, data: { skillGroupId: string; branchId?: string; rankId?: string; skillCode: string; name: string; narrativeName?: string; description?: string; levels: Prisma.InputJsonValue; maxLevel?: number; iconUrl?: string; isRequired?: boolean; requiredForRankId?: string; expPerLevel?: number }) {
    return this.prisma.skill.create({ data: { orgId, ...data } });
  }

  // ── Skill Progress ──

  async getSkillProgress(orgId: string, memberId: string) {
    return this.prisma.memberSkillProgress.findMany({
      where: { orgId, orgMemberId: memberId },
      include: { skill: { include: { skillGroup: { select: { name: true, icon: true, color: true } } } } },
    });
  }

  async startSkill(orgId: string, memberId: string, skillId: string) {
    const existing = await this.prisma.memberSkillProgress.findUnique({
      where: { orgMemberId_skillId: { orgMemberId: memberId, skillId } },
    });
    if (existing) return existing;

    const progress = await this.prisma.memberSkillProgress.create({
      data: { orgId, orgMemberId: memberId, skillId, currentLevel: 0 },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.SCOUT.SKILL_STARTED,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: { skillId },
      actorUserId: memberId,
    });

    return progress;
  }

  async verifySkillLevel(orgId: string, memberId: string, skillId: string, level: number, verifiedBy: string) {
    const progress = await this.prisma.memberSkillProgress.findUnique({
      where: { orgMemberId_skillId: { orgMemberId: memberId, skillId } },
    });
    if (!progress) throw new NotFoundException('Skill progress not found');

    const verifiedLevels = (progress.verifiedLevels as Record<string, boolean>) || {};
    verifiedLevels[String(level)] = true;

    const updated = await this.prisma.memberSkillProgress.update({
      where: { orgMemberId_skillId: { orgMemberId: memberId, skillId } },
      data: { currentLevel: level, verifiedLevels: verifiedLevels as Prisma.InputJsonValue },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.SCOUT.SKILL_VERIFIED,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: { skillId, level, memberId },
      actorUserId: verifiedBy,
    });

    return updated;
  }

  // ── Member Ranks ──

  async getMemberRanks(orgId: string, memberId: string) {
    return this.prisma.memberRank.findMany({
      where: { orgId, orgMemberId: memberId },
      include: { rank: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  async transitionRank(orgId: string, memberId: string, rankId: string, action: string, actorUserId: string) {
    const memberRank = await this.prisma.memberRank.findFirst({
      where: { orgMemberId: memberId, rankId },
    });
    if (!memberRank) throw new NotFoundException('Member rank not found');

    const newStatus = this.progression.transitionRank(memberRank.status, action);
    const updateData: Prisma.MemberRankUpdateInput = { status: newStatus };

    if (newStatus === 'completed') {
      updateData.completedAt = new Date();
      updateData.verifiedBy = actorUserId;
    }

    const updated = await this.prisma.memberRank.update({ where: { id: memberRank.id }, data: updateData });

    const eventMap: Record<string, string> = {
      eligible: DOMAIN_EVENTS.SCOUT.RANK_ELIGIBLE,
      proposed: DOMAIN_EVENTS.SCOUT.RANK_PROPOSED,
      approved: DOMAIN_EVENTS.SCOUT.RANK_APPROVED,
      completed: DOMAIN_EVENTS.SCOUT.RANK_AWARDED,
    };

    if (eventMap[newStatus]) {
      await this.domainEvents.publish({
        orgId,
        eventType: eventMap[newStatus],
        aggregateId: memberId,
        aggregateType: 'OrgMember',
        payload: { rankId, fromStatus: memberRank.status, toStatus: newStatus },
        actorUserId,
      });
    }

    return { ...updated, allowedActions: this.progression.getAllowedRankActions(newStatus) };
  }

  async startRank(orgId: string, memberId: string, branchId: string, rankId: string) {
    return this.prisma.memberRank.create({
      data: { orgId, orgMemberId: memberId, branchId, rankId, status: 'in_progress', startedAt: new Date() },
    });
  }
}
