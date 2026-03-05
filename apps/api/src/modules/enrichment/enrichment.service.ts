import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { DOMAIN_EVENTS } from '@ttndd/constants';

@Injectable()
export class EnrichmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
  ) {}

  // ── Spiritual Log (privacy-by-default: only the member sees their own) ──

  async createSpiritualLog(orgId: string, memberId: string, data: {
    logDate: string; logType?: string; durationMinutes?: number;
    notes?: string; thanhNgonRef?: string;
    emotionBefore?: number; emotionAfter?: number;
  }, actorUserId: string) {
    if (memberId !== actorUserId) {
      throw new ForbiddenException('Spiritual logs are private — only the member can create their own');
    }

    const log = await this.prisma.spiritualLog.create({
      data: {
        orgId,
        orgMemberId: memberId,
        logDate: new Date(data.logDate),
        logType: data.logType,
        durationMinutes: data.durationMinutes,
        notes: data.notes,
        thanhNgonRef: data.thanhNgonRef,
        emotionBefore: data.emotionBefore,
        emotionAfter: data.emotionAfter,
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.ENRICHMENT.SPIRITUAL_LOG_CREATED,
      aggregateId: log.id,
      aggregateType: 'SpiritualLog',
      payload: {
        memberId,
        logDate: data.logDate,
        durationMinutes: data.durationMinutes,
        expEarned: log.expEarned,
      } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return log;
  }

  async findSpiritualLogsByMember(orgId: string, memberId: string, requesterId: string) {
    if (memberId !== requesterId) {
      throw new ForbiddenException('Spiritual logs are private — only the member can view their own');
    }

    return this.prisma.spiritualLog.findMany({
      where: { orgId, orgMemberId: memberId },
      orderBy: { logDate: 'desc' },
    });
  }

  // ── Ngu Gioi Assessment (HIDDEN from leaders — self-assessment only) ──

  async createOrUpdateNguGioi(orgId: string, memberId: string, data: {
    weekStart: string;
    batSatSinh?: number; batDuDao?: number; batTaDam?: number;
    batTuuNhuc?: number; batVongNgu?: number; reflection?: string;
  }, actorUserId: string) {
    if (memberId !== actorUserId) {
      throw new ForbiddenException('Ngu Gioi assessments are hidden — only the member can self-assess');
    }

    const weekStartDate = new Date(data.weekStart);

    const assessment = await this.prisma.nguGioiAssessment.upsert({
      where: {
        orgMemberId_weekStart: { orgMemberId: memberId, weekStart: weekStartDate },
      },
      create: {
        orgId,
        orgMemberId: memberId,
        weekStart: weekStartDate,
        batSatSinh: data.batSatSinh,
        batDuDao: data.batDuDao,
        batTaDam: data.batTaDam,
        batTuuNhuc: data.batTuuNhuc,
        batVongNgu: data.batVongNgu,
        reflection: data.reflection,
      },
      update: {
        batSatSinh: data.batSatSinh,
        batDuDao: data.batDuDao,
        batTaDam: data.batTaDam,
        batTuuNhuc: data.batTuuNhuc,
        batVongNgu: data.batVongNgu,
        reflection: data.reflection,
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.ENRICHMENT.NGU_GIOI_ASSESSED,
      aggregateId: assessment.id,
      aggregateType: 'NguGioiAssessment',
      payload: { memberId, weekStart: data.weekStart } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return assessment;
  }

  async findNguGioiByMember(orgId: string, memberId: string, requesterId: string) {
    if (memberId !== requesterId) {
      throw new ForbiddenException('Ngu Gioi assessments are hidden from leaders');
    }

    return this.prisma.nguGioiAssessment.findMany({
      where: { orgId, orgMemberId: memberId },
      orderBy: { weekStart: 'desc' },
    });
  }

  // ── Evaluation (5-dimension rubric) ──

  async createEvaluation(orgId: string, data: {
    orgMemberId: string; evaluatorId: string; branchId: string;
    evaluationType?: string; evaluationDate: string;
    scoreDaoDuc?: number; scoreKyNang?: number; scoreTheChat?: number;
    scoreLanhDao?: number; scorePhungSu?: number;
    strengths?: string; areasToImprove?: string; recommendations?: string;
    selfAssessment?: Prisma.InputJsonValue;
  }, actorUserId: string) {
    const evaluation = await this.prisma.evaluation.create({
      data: {
        orgId,
        orgMemberId: data.orgMemberId,
        evaluatorId: data.evaluatorId,
        branchId: data.branchId,
        evaluationType: data.evaluationType,
        evaluationDate: new Date(data.evaluationDate),
        scoreDaoDuc: data.scoreDaoDuc,
        scoreKyNang: data.scoreKyNang,
        scoreTheChat: data.scoreTheChat,
        scoreLanhDao: data.scoreLanhDao,
        scorePhungSu: data.scorePhungSu,
        strengths: data.strengths,
        areasToImprove: data.areasToImprove,
        recommendations: data.recommendations,
        selfAssessment: data.selfAssessment,
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.ENRICHMENT.EVALUATION_CREATED,
      aggregateId: evaluation.id,
      aggregateType: 'Evaluation',
      payload: {
        memberId: data.orgMemberId,
        evaluatorId: data.evaluatorId,
        evaluationType: data.evaluationType,
      } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return evaluation;
  }

  async findEvaluationsByMember(orgId: string, memberId: string) {
    return this.prisma.evaluation.findMany({
      where: { orgId, orgMemberId: memberId },
      orderBy: { evaluationDate: 'desc' },
    });
  }

  async findEvaluationsByEvaluator(orgId: string, evaluatorId: string) {
    return this.prisma.evaluation.findMany({
      where: { orgId, evaluatorId },
      orderBy: { evaluationDate: 'desc' },
    });
  }

  // ── Mentoring Relationship ──

  async createMentoringRelationship(orgId: string, data: {
    mentorId: string; menteeId: string; startDate?: string;
  }, actorUserId: string) {
    const relationship = await this.prisma.mentoringRelationship.create({
      data: {
        orgId,
        mentorId: data.mentorId,
        menteeId: data.menteeId,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.ENRICHMENT.MENTORING_STARTED,
      aggregateId: relationship.id,
      aggregateType: 'MentoringRelationship',
      payload: {
        mentorId: data.mentorId,
        menteeId: data.menteeId,
      } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return relationship;
  }

  async findByMentor(orgId: string, mentorId: string) {
    return this.prisma.mentoringRelationship.findMany({
      where: { orgId, mentorId, status: 'active' },
      include: { logs: { orderBy: { sessionDate: 'desc' }, take: 5 } },
    });
  }

  async findByMentee(orgId: string, menteeId: string) {
    return this.prisma.mentoringRelationship.findMany({
      where: { orgId, menteeId, status: 'active' },
      include: { logs: { orderBy: { sessionDate: 'desc' }, take: 5 } },
    });
  }

  // ── Mentoring Log ──

  async createMentoringLog(orgId: string, relationshipId: string, data: {
    sessionDate: string; topic?: string; outcome?: string; followUp?: string;
  }) {
    const relationship = await this.prisma.mentoringRelationship.findFirst({
      where: { id: relationshipId, orgId },
    });
    if (!relationship) throw new NotFoundException('Mentoring relationship not found');

    return this.prisma.mentoringLog.create({
      data: {
        orgId,
        relationshipId,
        sessionDate: new Date(data.sessionDate),
        topic: data.topic,
        outcome: data.outcome,
        followUp: data.followUp,
      },
    });
  }

  async findLogsByRelationship(orgId: string, relationshipId: string) {
    return this.prisma.mentoringLog.findMany({
      where: { orgId, relationshipId },
      orderBy: { sessionDate: 'desc' },
    });
  }
}
