import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import { RankProgressionService } from './rank-progression.service';
import { FileStorageService } from '../file-storage';

@Injectable()
export class ScoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
    private readonly progression: RankProgressionService,
    @Optional() private readonly fileStorage?: FileStorageService,
  ) {}

  // ── Rank Definitions ──

  async getRankDefinitions(orgId: string, branchId?: string) {
    const where: Prisma.RankDefinitionWhereInput = { orgId };
    if (branchId) where.branchId = branchId;
    return this.prisma.rankDefinition.findMany({ where, orderBy: { rankOrder: 'asc' } });
  }

  async createRankDefinition(
    orgId: string,
    data: {
      branchId: string;
      rankCode: string;
      rankName: string;
      narrativeName?: string;
      rankOrder: number;
      description?: string;
      iconUrl?: string;
      badgeImageUrl?: string;
      minExp?: number;
    },
  ) {
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

  async createSkillGroup(
    orgId: string,
    data: {
      name: string;
      branchId?: string;
      narrativeName?: string;
      description?: string;
      icon?: string;
      color?: string;
      orderIndex?: number;
    },
  ) {
    return this.prisma.skillGroup.create({ data: { orgId, ...data } });
  }

  async createSkill(
    orgId: string,
    data: {
      skillGroupId: string;
      branchId?: string;
      rankId?: string;
      skillCode: string;
      name: string;
      narrativeName?: string;
      description?: string;
      levels: Prisma.InputJsonValue;
      maxLevel?: number;
      iconUrl?: string;
      isRequired?: boolean;
      requiredForRankId?: string;
      expPerLevel?: number;
    },
  ) {
    return this.prisma.skill.create({ data: { orgId, ...data } });
  }

  // ── Skill Progress ──

  async getSkillProgress(orgId: string, memberId: string) {
    return this.prisma.memberSkillProgress.findMany({
      where: { orgId, orgMemberId: memberId },
      include: {
        skill: { include: { skillGroup: { select: { name: true, icon: true, color: true } } } },
      },
    });
  }

  async startSkill(orgId: string, memberId: string, skillId: string, actorUserId: string) {
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
      actorUserId,
    });

    return progress;
  }

  async verifySkillLevel(
    orgId: string,
    memberId: string,
    skillId: string,
    level: number,
    verifiedBy: string,
  ) {
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

  async transitionRank(
    orgId: string,
    memberId: string,
    rankId: string,
    action: string,
    actorUserId: string,
  ) {
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

    const updated = await this.prisma.memberRank.update({
      where: { id: memberRank.id },
      data: updateData,
    });

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
      data: {
        orgId,
        orgMemberId: memberId,
        branchId,
        rankId,
        status: 'in_progress',
        startedAt: new Date(),
      },
    });
  }

  // ── Evidence Submission ──

  async submitEvidence(
    orgId: string,
    memberId: string,
    data: {
      skillId: string;
      level: number;
      evidenceType: string;
      evidenceUrl?: string;
      fileRefId?: string;
      notes?: string;
    },
    actorUserId: string,
  ) {
    await this.assertReadyFileRefs(orgId, [data.fileRefId]);

    const evidence = await this.prisma.skillEvidence.create({
      data: {
        orgId,
        orgMemberId: memberId,
        skillId: data.skillId,
        level: data.level,
        evidenceType: data.evidenceType,
        evidenceUrl: data.evidenceUrl,
        fileRefId: data.fileRefId,
        notes: data.notes,
        status: 'submitted',
      },
    });

    // Transition skill to pending_review if currently in_progress
    const progress = await this.prisma.memberSkillProgress.findUnique({
      where: { orgMemberId_skillId: { orgMemberId: memberId, skillId: data.skillId } },
    });
    if (progress && progress.currentLevel < data.level) {
      // Ensure we have a progress record, auto-start if not exists
    }

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.SCOUT.EVIDENCE_SUBMITTED,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: { skillId: data.skillId, level: data.level, evidenceId: evidence.id },
      actorUserId,
    });

    return evidence;
  }

  private async assertReadyFileRefs(orgId: string, fileRefIds: Array<string | undefined>) {
    const requested = fileRefIds.filter(Boolean);
    if (requested.length === 0) return;
    if (!this.fileStorage) throw new BadRequestException('File storage integration unavailable');
    await this.fileStorage.assertReadyFileRefs(orgId, requested);
  }

  async reviewEvidence(
    orgId: string,
    evidenceId: string,
    approved: boolean,
    reviewedBy: string,
    reviewNotes?: string,
  ) {
    const evidence = await this.prisma.skillEvidence.findFirst({
      where: { id: evidenceId, orgId },
    });
    if (!evidence) throw new NotFoundException('Evidence not found');

    const newStatus = approved ? 'approved' : 'rejected';
    const updated = await this.prisma.skillEvidence.update({
      where: { id: evidenceId },
      data: { status: newStatus, reviewedBy, reviewedAt: new Date(), reviewNotes },
    });

    // If approved, auto-verify the skill level
    if (approved) {
      await this.verifySkillLevel(
        orgId,
        evidence.orgMemberId,
        evidence.skillId,
        evidence.level,
        reviewedBy,
      );
    }

    return updated;
  }

  async awardSkill(orgId: string, memberId: string, skillId: string, actorUserId: string) {
    const progress = await this.prisma.memberSkillProgress.findUnique({
      where: { orgMemberId_skillId: { orgMemberId: memberId, skillId } },
    });
    if (!progress) throw new NotFoundException('Skill progress not found');

    const updated = await this.prisma.memberSkillProgress.update({
      where: { orgMemberId_skillId: { orgMemberId: memberId, skillId } },
      data: { completedAt: new Date() },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.SCOUT.SKILL_AWARDED,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: { skillId, level: progress.currentLevel },
      actorUserId,
    });

    // Check rank eligibility after awarding a skill
    await this.checkRankEligibility(orgId, memberId, actorUserId);

    return updated;
  }

  async checkRankEligibility(orgId: string, memberId: string, actorUserId?: string) {
    // Get member's current rank progress
    const memberRanks = await this.prisma.memberRank.findMany({
      where: { orgId, orgMemberId: memberId, status: 'in_progress' },
      include: { rank: true },
    });

    // Get completed skills
    const completedSkills = await this.prisma.memberSkillProgress.findMany({
      where: { orgId, orgMemberId: memberId, completedAt: { not: null } },
      include: { skill: true },
    });

    const results: Array<{ rankId: string; eligible: boolean }> = [];

    for (const mr of memberRanks) {
      // Find required skills for this rank
      const requiredSkills = await this.prisma.skill.findMany({
        where: { orgId, requiredForRankId: mr.rankId, isRequired: true },
      });

      const allRequired = requiredSkills.every((rs) =>
        completedSkills.some((cs) => cs.skillId === rs.id),
      );

      if (allRequired && requiredSkills.length > 0) {
        // Auto-transition to eligible
        try {
          const newStatus = this.progression.transitionRank(mr.status, 'auto_check');
          await this.prisma.memberRank.update({
            where: { id: mr.id },
            data: { status: newStatus },
          });

          await this.domainEvents.publish({
            orgId,
            eventType: DOMAIN_EVENTS.SCOUT.RANK_ELIGIBLE,
            aggregateId: memberId,
            aggregateType: 'OrgMember',
            payload: { rankId: mr.rankId },
            actorUserId,
          });

          results.push({ rankId: mr.rankId, eligible: true });
        } catch {
          // Transition not allowed from current state (already eligible)
          results.push({ rankId: mr.rankId, eligible: false });
        }
      } else {
        results.push({ rankId: mr.rankId, eligible: false });
      }
    }

    return results;
  }

  // ── Scout Dashboard ──

  async getScoutDashboard(orgId: string, memberId: string) {
    const [skillProgress, memberRanks, recentEvidence] = await Promise.all([
      this.prisma.memberSkillProgress.findMany({
        where: { orgId, orgMemberId: memberId },
        include: {
          skill: { include: { skillGroup: { select: { name: true, icon: true, color: true } } } },
        },
        orderBy: { skill: { skillCode: 'asc' } },
      }),
      this.prisma.memberRank.findMany({
        where: { orgId, orgMemberId: memberId },
        include: { rank: true },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.skillEvidence.findMany({
        where: { orgId, orgMemberId: memberId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { skill: { select: { name: true, skillCode: true } } },
      }),
    ]);

    // Aggregate stats
    const totalSkills = skillProgress.length;
    const completedSkills = skillProgress.filter((sp) => sp.completedAt !== null).length;
    const currentRank = memberRanks.find((mr) => mr.status !== 'completed');
    const completedRanks = memberRanks.filter((mr) => mr.status === 'completed');

    return {
      memberId,
      stats: {
        totalSkills,
        completedSkills,
        skillCompletionRate:
          totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0,
        currentRank: currentRank
          ? {
              ...currentRank,
              allowedActions: this.progression.getAllowedRankActions(currentRank.status),
            }
          : null,
        completedRanksCount: completedRanks.length,
      },
      skillProgress,
      memberRanks: memberRanks.map((mr) => ({
        ...mr,
        allowedActions: this.progression.getAllowedRankActions(mr.status),
      })),
      recentEvidence,
    };
  }
}
