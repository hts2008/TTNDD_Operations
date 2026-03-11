import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
      data: { orgId, orgMemberId: memberId, skillId, currentLevel: 0, status: 'in_progress', startedAt: new Date() },
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

  // ── Evidence Submission (T-0079) ──

  async submitEvidence(orgId: string, progressId: string, data: { fileObjectId?: string; url?: string; note?: string }, actorUserId: string) {
    const progress = await this.prisma.memberSkillProgress.findFirst({
      where: { id: progressId, orgId },
    });
    if (!progress) throw new NotFoundException('Progress not found');
    if (progress.status !== 'in_progress' && progress.status !== 'rejected') {
      throw new BadRequestException(`Cannot submit evidence when status is "${progress.status}"`);
    }

    const [evidence] = await this.prisma.$transaction([
      this.prisma.skillEvidence.create({
        data: { orgId, progressId, ...data },
      }),
      this.prisma.memberSkillProgress.update({
        where: { id: progressId },
        data: { status: 'submitted', submittedAt: new Date() },
      }),
    ]);

    await this.domainEvents.publish({
      orgId,
      eventType: 'scout.skill_submitted',
      aggregateId: progress.orgMemberId,
      aggregateType: 'OrgMember',
      payload: { progressId, skillId: progress.skillId },
      actorUserId,
    });

    return evidence;
  }

  // ── Verify Queue (T-0079) ──

  async getVerifyQueue(orgId: string) {
    return this.prisma.memberSkillProgress.findMany({
      where: { orgId, status: 'submitted' },
      include: {
        skill: { select: { id: true, name: true, skillCode: true } },
        orgMember: { select: { id: true, user: { select: { displayName: true } } } },
        evidence: { orderBy: { capturedAt: 'desc' } },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  // ── Verify / Reject (T-0079) ──

  async verifyProgress(orgId: string, progressId: string, verifierId: string, decision: 'approved' | 'rejected', comment?: string) {
    const progress = await this.prisma.memberSkillProgress.findFirst({
      where: { id: progressId, orgId },
    });
    if (!progress) throw new NotFoundException('Progress not found');
    if (progress.status !== 'submitted') {
      throw new BadRequestException(`Cannot verify when status is "${progress.status}"`);
    }

    const now = new Date();
    const newStatus = decision === 'approved' ? 'verified' : 'rejected';
    const updateData: Record<string, unknown> = { status: newStatus };
    if (decision === 'approved') {
      updateData.verifiedAt = now;
    }

    const [verification] = await this.prisma.$transaction([
      this.prisma.skillVerification.create({
        data: { orgId, progressId, verifierPersonId: verifierId, decision, comment },
      }),
      this.prisma.memberSkillProgress.update({
        where: { id: progressId },
        data: updateData,
      }),
    ]);

    await this.domainEvents.publish({
      orgId,
      eventType: decision === 'approved'
        ? DOMAIN_EVENTS.SCOUT.SKILL_VERIFIED
        : 'scout.skill_rejected',
      aggregateId: progress.orgMemberId,
      aggregateType: 'OrgMember',
      payload: { progressId, skillId: progress.skillId, decision, verifierId },
      actorUserId: verifierId,
    });

    return verification;
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

  // ── Habit Tracking (T-0081) ──

  async getHabits(orgId: string) {
    return this.prisma.habitDef.findMany({ where: { orgId, isActive: true }, orderBy: { name: 'asc' } });
  }

  async createHabit(orgId: string, data: { key: string; name: string; cadence: string; scoringRule?: object }) {
    return this.prisma.habitDef.create({ data: { orgId, ...data, scoringRule: (data.scoringRule ?? {}) as any } });
  }

  async logHabit(orgId: string, personId: string, habitDefId: string, logDate: string, status: string, note?: string) {
    return this.prisma.habitLog.upsert({
      where: { personId_habitDefId_logDate: { personId, habitDefId, logDate: new Date(logDate) } },
      create: { orgId, personId, habitDefId, logDate: new Date(logDate), status, note },
      update: { status, note },
    });
  }

  async getHabitLogs(orgId: string, personId: string, habitDefId?: string) {
    return this.prisma.habitLog.findMany({
      where: { orgId, personId, ...(habitDefId ? { habitDefId } : {}) },
      include: { habitDef: { select: { name: true, cadence: true } } },
      orderBy: { logDate: 'desc' },
      take: 90,
    });
  }

  async getStreak(orgId: string, personId: string, habitDefId: string) {
    const logs = await this.prisma.habitLog.findMany({
      where: { orgId, personId, habitDefId, status: 'done' },
      orderBy: { logDate: 'desc' },
      take: 365,
    });
    let streak = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (const log of logs) {
      const logDay = new Date(log.logDate); logDay.setHours(0, 0, 0, 0);
      const diff = Math.round((today.getTime() - logDay.getTime()) / 86400000);
      if (diff === streak || diff === streak + 1) { streak++; } else { break; }
    }
    return { habitDefId, personId, currentStreak: streak, totalDone: logs.length };
  }

  // ── Achievements (T-0082) ──

  async getAchievements(orgId: string) {
    return this.prisma.achievementDef.findMany({ where: { orgId }, orderBy: { name: 'asc' } });
  }

  async createAchievement(orgId: string, data: { key: string; name: string; description?: string; rarity?: string }) {
    return this.prisma.achievementDef.create({ data: { orgId, ...data } });
  }

  async awardAchievement(orgId: string, personId: string, achievementDefId: string, awardedByPersonId?: string, sourceEventId?: string) {
    const award = await this.prisma.achievementAward.create({
      data: { orgId, personId, achievementDefId, awardedByPersonId, sourceEventId },
    });
    await this.domainEvents.publish({
      orgId,
      eventType: 'scout.achievement_awarded',
      aggregateId: personId,
      aggregateType: 'OrgMember',
      payload: { achievementDefId, awardedByPersonId },
      actorUserId: awardedByPersonId ?? personId,
    });
    return award;
  }

  async getMemberAwards(orgId: string, personId: string) {
    return this.prisma.achievementAward.findMany({
      where: { orgId, personId },
      include: { achievementDef: { select: { name: true, rarity: true, description: true } } },
      orderBy: { awardedAt: 'desc' },
    });
  }

  // ── Activity & Service Log (T-0085) ──

  async logActivity(orgId: string, data: { personId: string; activityType: string; hours?: number; projectId?: string; workItemId?: string; location?: string; note?: string; happenedAt?: string }) {
    return this.prisma.activityLog.create({
      data: { orgId, ...data, hours: data.hours as any, happenedAt: data.happenedAt ? new Date(data.happenedAt) : new Date() },
    });
  }

  async getActivityLogs(orgId: string, personId: string) {
    return this.prisma.activityLog.findMany({
      where: { orgId, personId },
      orderBy: { happenedAt: 'desc' },
      take: 100,
    });
  }

  async getServiceHours(orgId: string, personId: string) {
    const result = await this.prisma.activityLog.aggregate({
      where: { orgId, personId, activityType: 'service' },
      _sum: { hours: true },
      _count: true,
    });
    return { personId, totalHours: result._sum.hours ?? 0, totalEntries: result._count };
  }

  // ── Dashboards (T-0083, T-0084) ──

  async getPersonalDashboard(orgId: string, memberId: string) {
    const [skills, ranks, awards, serviceHours, habits] = await Promise.all([
      this.prisma.memberSkillProgress.findMany({
        where: { orgId, orgMemberId: memberId },
        include: { skill: { select: { name: true, domainId: true } } },
      }),
      this.prisma.memberRank.findMany({
        where: { orgId, orgMemberId: memberId },
        include: { rank: { select: { rankName: true, rankCode: true } } },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.achievementAward.count({ where: { orgId, personId: memberId } }),
      this.prisma.activityLog.aggregate({
        where: { orgId, personId: memberId, activityType: 'service' },
        _sum: { hours: true },
      }),
      this.prisma.habitLog.count({ where: { orgId, personId: memberId, status: 'done' } }),
    ]);

    const total = skills.length;
    const verified = skills.filter(s => s.status === 'verified' || s.status === 'awarded').length;

    return {
      memberId,
      skillProgress: { total, verified, pct: total ? Math.round((verified / total) * 100) : 0 },
      currentRank: ranks[0] ?? null,
      achievements: awards,
      serviceHours: serviceHours._sum.hours ?? 0,
      habitCheckIns: habits,
    };
  }

  async getLeaderDashboard(orgId: string) {
    const [memberCount, submitted, skillStats] = await Promise.all([
      this.prisma.memberSkillProgress.groupBy({
        by: ['orgMemberId'],
        where: { orgId },
        _count: true,
      }),
      this.prisma.memberSkillProgress.count({ where: { orgId, status: 'submitted' } }),
      this.prisma.memberSkillProgress.groupBy({
        by: ['status'],
        where: { orgId },
        _count: true,
      }),
    ]);

    return {
      totalMembers: memberCount.length,
      pendingVerifications: submitted,
      statusBreakdown: skillStats.map(s => ({ status: s.status, count: s._count })),
    };
  }
}
