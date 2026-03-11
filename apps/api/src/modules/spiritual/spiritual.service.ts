import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';

/**
 * SM-14: Evaluation Lifecycle
 * draft → submitted → reviewed → finalized
 */
const EVALUATION_TRANSITIONS: Record<string, Record<string, string>> = {
  draft: { submit: 'submitted' },
  submitted: { review: 'reviewed', return: 'draft' },
  reviewed: { finalize: 'finalized', return: 'submitted' },
};

@Injectable()
export class SpiritualService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── Spiritual Log (T-0096) ──

  async createSpiritualLog(orgId: string, data: {
    orgMemberId: string; logDate: string; logType?: string; durationMinutes?: number;
    notes?: string; thanhNgonRef?: string; emotionBefore?: number; emotionAfter?: number;
  }) {
    const log = await this.prisma.spiritualLog.create({
      data: {
        orgId,
        ...data,
        logDate: new Date(data.logDate),
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: 'spiritual.log_created',
      aggregateId: data.orgMemberId,
      aggregateType: 'OrgMember',
      payload: { logType: data.logType, logDate: data.logDate },
      actorUserId: data.orgMemberId,
    });

    return log;
  }

  async getSpiritualLogs(orgId: string, memberId: string, filters?: { logType?: string; from?: string; to?: string }) {
    const where: Prisma.SpiritualLogWhereInput = { orgId, orgMemberId: memberId };
    if (filters?.logType) where.logType = filters.logType;
    if (filters?.from || filters?.to) {
      where.logDate = {};
      if (filters.from) where.logDate.gte = new Date(filters.from);
      if (filters.to) where.logDate.lte = new Date(filters.to);
    }

    return this.prisma.spiritualLog.findMany({
      where,
      orderBy: { logDate: 'desc' },
      take: 90,
    });
  }

  async getSpiritualStats(orgId: string, memberId: string) {
    const [total, recent, avgDuration] = await Promise.all([
      this.prisma.spiritualLog.count({ where: { orgId, orgMemberId: memberId } }),
      this.prisma.spiritualLog.count({
        where: { orgId, orgMemberId: memberId, logDate: { gte: new Date(Date.now() - 30 * 86400000) } },
      }),
      this.prisma.spiritualLog.aggregate({
        where: { orgId, orgMemberId: memberId },
        _avg: { durationMinutes: true },
      }),
    ]);

    return { memberId, totalLogs: total, last30Days: recent, avgDurationMinutes: avgDuration._avg.durationMinutes ?? 0 };
  }

  // ── Ngũ Giới Assessment (T-0097) ──

  async createNguGioiAssessment(orgId: string, data: {
    orgMemberId: string; weekStart: string;
    batSatSinh?: number; batDuDao?: number; batTaDam?: number; batTuuNhuc?: number; batVongNgu?: number;
    reflection?: string;
  }) {
    return this.prisma.nguGioiAssessment.upsert({
      where: { orgMemberId_weekStart: { orgMemberId: data.orgMemberId, weekStart: new Date(data.weekStart) } },
      create: { orgId, ...data, weekStart: new Date(data.weekStart) },
      update: { ...data, weekStart: new Date(data.weekStart) },
    });
  }

  async getNguGioiAssessments(orgId: string, memberId: string, limit = 12) {
    return this.prisma.nguGioiAssessment.findMany({
      where: { orgId, orgMemberId: memberId },
      orderBy: { weekStart: 'desc' },
      take: limit,
    });
  }

  async getLatestNguGioi(orgId: string, memberId: string) {
    const latest = await this.prisma.nguGioiAssessment.findFirst({
      where: { orgId, orgMemberId: memberId },
      orderBy: { weekStart: 'desc' },
    });
    if (!latest) throw new NotFoundException('No Ngũ Giới assessment found');
    return latest;
  }

  // ── Evaluation (T-0098) ──

  async createEvaluation(orgId: string, data: {
    orgMemberId: string; evaluatorId: string; branchId: string; evaluationType?: string;
    scoreDaoDuc?: number; scoreKyNang?: number; scoreTheChat?: number;
    scoreLanhDao?: number; scorePhungSu?: number;
    strengths?: string; areasToImprove?: string; recommendations?: string;
    selfAssessment?: Prisma.InputJsonValue; evaluationDate: string;
  }) {
    return this.prisma.evaluation.create({
      data: { orgId, ...data, evaluationDate: new Date(data.evaluationDate) },
    });
  }

  async getEvaluations(orgId: string, memberId: string) {
    return this.prisma.evaluation.findMany({
      where: { orgId, orgMemberId: memberId },
      orderBy: { evaluationDate: 'desc' },
    });
  }

  async transitionEvaluation(orgId: string, evaluationId: string, action: string, actorUserId: string) {
    const evaluation = await this.prisma.evaluation.findFirst({ where: { id: evaluationId, orgId } });
    if (!evaluation) throw new NotFoundException('Evaluation not found');

    const allowed = EVALUATION_TRANSITIONS[evaluation.status];
    if (!allowed?.[action]) {
      throw new BadRequestException(`Action '${action}' not allowed from '${evaluation.status}'`);
    }

    const newStatus = allowed[action];
    const updated = await this.prisma.evaluation.update({ where: { id: evaluationId }, data: { status: newStatus } });

    await this.audit.log({ orgId, userId: actorUserId, action: `evaluation.${action}`, resource: 'Evaluation', resourceId: evaluationId, newValue: { fromStatus: evaluation.status, toStatus: newStatus } as unknown as Prisma.InputJsonValue });

    if (newStatus === 'finalized') {
      await this.domainEvents.publish({
        orgId,
        eventType: 'spiritual.evaluation_finalized',
        aggregateId: evaluation.orgMemberId,
        aggregateType: 'OrgMember',
        payload: { evaluationId, evaluationType: evaluation.evaluationType },
        actorUserId,
      });
    }

    return updated;
  }

  // ── Mentoring (T-0099) ──

  async createMentoringRelationship(orgId: string, data: { mentorId: string; menteeId: string; startDate?: string }) {
    return this.prisma.mentoringRelationship.create({
      data: { orgId, ...data, startDate: data.startDate ? new Date(data.startDate) : new Date() },
    });
  }

  async getMentoringRelationships(orgId: string, personId: string, role: 'mentor' | 'mentee') {
    const where: Prisma.MentoringRelationshipWhereInput = { orgId };
    if (role === 'mentor') where.mentorId = personId;
    else where.menteeId = personId;

    return this.prisma.mentoringRelationship.findMany({
      where,
      include: { _count: { select: { logs: true } } },
    });
  }

  async endMentoringRelationship(orgId: string, relationshipId: string) {
    return this.prisma.mentoringRelationship.update({
      where: { id: relationshipId },
      data: { status: 'ended' },
    });
  }

  async createMentoringLog(orgId: string, data: {
    relationshipId: string; sessionDate: string; topic?: string; outcome?: string; followUp?: string;
  }) {
    return this.prisma.mentoringLog.create({
      data: { orgId, ...data, sessionDate: new Date(data.sessionDate) },
    });
  }

  async getMentoringLogs(orgId: string, relationshipId: string) {
    return this.prisma.mentoringLog.findMany({
      where: { orgId, relationshipId },
      orderBy: { sessionDate: 'desc' },
    });
  }
}
