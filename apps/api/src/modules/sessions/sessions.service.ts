import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';

/**
 * SM-12: Session Lifecycle
 * planned → published → in_progress → completed → archived
 */
const SESSION_TRANSITIONS: Record<string, Record<string, string>> = {
  planned: { publish: 'published', cancel: 'cancelled' },
  published: { start: 'in_progress', cancel: 'cancelled' },
  in_progress: { complete: 'completed' },
  completed: { archive: 'archived' },
};

function toPositiveInt(value: number | string | undefined, fallback: number, max = 100) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.trunc(parsed), max);
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── Session CRUD ──

  async create(
    orgId: string,
    data: {
      branchId: string;
      title: string;
      sessionDate: string;
      startTime?: string;
      endTime?: string;
      location?: string;
      sessionType?: string;
      theme?: string;
      pillarDaoDuc?: string;
      pillarPhuongPhap?: string;
      pillarGiaoDuc?: string;
      lessonPlan?: Prisma.InputJsonValue;
      materials?: Prisma.InputJsonValue;
    },
    actorUserId: string,
  ) {
    const session = await this.prisma.session.create({
      data: {
        orgId,
        ...data,
        sessionDate: new Date(data.sessionDate),
        createdBy: actorUserId,
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.SESSION.CREATED,
      aggregateId: session.id,
      aggregateType: 'Session',
      payload: { title: data.title, date: data.sessionDate },
      actorUserId,
    });

    return session;
  }

  async findMany(
    orgId: string,
    filters?: { branchId?: string; status?: string; from?: string; to?: string },
    page: number | string = 1,
    limit: number | string = 20,
  ) {
    const currentPage = toPositiveInt(page, 1);
    const pageSize = toPositiveInt(limit, 20);
    const where: Prisma.SessionWhereInput = { orgId };
    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.status) where.status = filters.status;
    if (filters?.from || filters?.to) {
      where.sessionDate = {};
      if (filters.from) where.sessionDate.gte = new Date(filters.from);
      if (filters.to) where.sessionDate.lte = new Date(filters.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        include: {
          branch: { select: { name: true, code: true } },
          _count: { select: { attendance: true } },
        },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
        orderBy: { sessionDate: 'desc' },
      }),
      this.prisma.session.count({ where }),
    ]);

    return { data, meta: { total, page: currentPage, limit: pageSize } };
  }

  async findById(orgId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, orgId },
      include: {
        branch: true,
        attendance: {
          include: {
            orgMember: {
              select: {
                scoutName: true,
                memberCode: true,
                user: { select: { displayName: true } },
              },
            },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async update(
    orgId: string,
    sessionId: string,
    data: Partial<{
      title: string;
      sessionDate: string;
      startTime: string;
      endTime: string;
      location: string;
      theme: string;
      lessonPlan: Prisma.InputJsonValue;
      debriefNotes: string;
      energyRating: number;
      engagementRating: number;
    }>,
    actorUserId: string,
  ) {
    const updateData: Prisma.SessionUpdateInput = { ...data };
    if (data.sessionDate) updateData.sessionDate = new Date(data.sessionDate);

    const session = await this.prisma.session.update({
      where: { id: sessionId, orgId },
      data: updateData,
    });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'session.updated',
      resource: 'Session',
      resourceId: sessionId,
      newValue: data as Prisma.InputJsonValue,
    });
    return session;
  }

  // ── State Machine ──

  async transition(orgId: string, sessionId: string, action: string, actorUserId: string) {
    const session = await this.findById(orgId, sessionId);
    const allowed = SESSION_TRANSITIONS[session.status];
    if (!allowed?.[action]) {
      throw new BadRequestException(`Action '${action}' not allowed from '${session.status}'`);
    }
    const newStatus = allowed[action];

    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: newStatus },
    });

    if (newStatus === 'published') {
      await this.domainEvents.publish({
        orgId,
        eventType: DOMAIN_EVENTS.SESSION.PUBLISHED,
        aggregateId: sessionId,
        aggregateType: 'Session',
        payload: {},
        actorUserId,
      });
    }

    return updated;
  }

  // ── Attendance ──

  async markAttendance(
    orgId: string,
    sessionId: string,
    records: Array<{ memberId: string; status: string; excusedReason?: string }>,
    actorUserId: string,
  ) {
    const ops = records.map((r) =>
      this.prisma.sessionAttendance.upsert({
        where: { sessionId_orgMemberId: { sessionId, orgMemberId: r.memberId } },
        create: {
          orgId,
          sessionId,
          orgMemberId: r.memberId,
          status: r.status,
          excusedReason: r.excusedReason,
          checkInTime: r.status === 'present' ? new Date() : undefined,
          notedBy: actorUserId,
        },
        update: { status: r.status, excusedReason: r.excusedReason },
      }),
    );

    await this.prisma.$transaction(ops);

    for (const r of records.filter((r) => r.status === 'present')) {
      await this.domainEvents.publish({
        orgId,
        eventType: DOMAIN_EVENTS.SESSION.ATTENDANCE_MARKED,
        aggregateId: sessionId,
        aggregateType: 'Session',
        payload: { memberId: r.memberId, sessionId, status: r.status },
        actorUserId,
      });
    }

    return { marked: records.length };
  }

  async getAttendanceReport(orgId: string, memberId: string) {
    const [total, present, absent, excused] = await Promise.all([
      this.prisma.sessionAttendance.count({ where: { orgId, orgMemberId: memberId } }),
      this.prisma.sessionAttendance.count({
        where: { orgId, orgMemberId: memberId, status: 'present' },
      }),
      this.prisma.sessionAttendance.count({
        where: { orgId, orgMemberId: memberId, status: 'absent' },
      }),
      this.prisma.sessionAttendance.count({
        where: { orgId, orgMemberId: memberId, status: 'excused' },
      }),
    ]);
    return {
      memberId,
      total,
      present,
      absent,
      excused,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  }
}
