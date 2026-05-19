import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';

/**
 * SM-13: Event/Camp Lifecycle
 * planning → proposed → approved → registration_open → go_live → in_progress → completed → reported
 *
 * Safety gates: 2-adult rule + safety checklist must pass before go_live
 */
const EVENT_TRANSITIONS: Record<string, Record<string, string>> = {
  planning: { propose: 'proposed' },
  proposed: { approve: 'approved', reject: 'planning' },
  approved: { open_registration: 'registration_open' },
  registration_open: { go_live: 'go_live', close_registration: 'approved' },
  go_live: { start: 'in_progress' },
  in_progress: { complete: 'completed' },
  completed: { submit_report: 'reported' },
};

@Injectable()
export class EventsCampService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  async create(
    orgId: string,
    data: {
      title: string;
      eventType?: string;
      startDate: string;
      endDate: string;
      location?: string;
      maxParticipants?: number;
      targetBranches?: string[];
      schedule?: Prisma.InputJsonValue;
      raciMatrix?: Prisma.InputJsonValue;
      riskAssessment?: Prisma.InputJsonValue;
      expReward?: number;
      spicesTags?: string[];
    },
    actorUserId: string,
  ) {
    const event = await this.prisma.event.create({
      data: {
        orgId,
        ...data,
        targetBranches: data.targetBranches ?? [],
        spicesTags: data.spicesTags ?? [],
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        createdBy: actorUserId,
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.EVENT.CREATED,
      aggregateId: event.id,
      aggregateType: 'Event',
      payload: { title: data.title, type: data.eventType },
      actorUserId,
    });

    return event;
  }

  async findMany(
    orgId: string,
    filters?: { status?: string; from?: string; to?: string },
    page = 1,
    limit = 20,
  ) {
    const where: Prisma.EventWhereInput = { orgId };
    if (filters?.status) where.status = filters.status;
    if (filters?.from || filters?.to) {
      where.startDate = {};
      if (filters.from) where.startDate.gte = new Date(filters.from);
      if (filters.to) where.startDate.lte = new Date(filters.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: { _count: { select: { registrations: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findById(orgId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, orgId },
      include: {
        registrations: {
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
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async update(
    orgId: string,
    eventId: string,
    data: Partial<{
      title: string;
      location: string;
      schedule: Prisma.InputJsonValue;
      raciMatrix: Prisma.InputJsonValue;
      riskAssessment: Prisma.InputJsonValue;
      safetyChecklist: Prisma.InputJsonValue;
      weatherBackup: string;
      emergencyPlan: string;
      postEventReport: Prisma.InputJsonValue;
    }>,
    actorUserId: string,
  ) {
    const event = await this.prisma.event.update({ where: { id: eventId, orgId }, data });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'event.updated',
      resource: 'Event',
      resourceId: eventId,
      newValue: data as Prisma.InputJsonValue,
    });
    return event;
  }

  // ── State Machine SM-13 ──

  async transition(orgId: string, eventId: string, action: string, actorUserId: string) {
    const event = await this.findById(orgId, eventId);
    const allowed = EVENT_TRANSITIONS[event.status];
    if (!allowed?.[action]) {
      throw new BadRequestException(`Action '${action}' not allowed from '${event.status}'`);
    }

    if (action === 'go_live') {
      this.validateSafetyGates(event);
    }

    const newStatus = allowed[action];
    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { status: newStatus },
    });

    const eventMap: Record<string, string> = {
      registration_open: DOMAIN_EVENTS.EVENT.REGISTRATION_OPENED,
      completed: DOMAIN_EVENTS.EVENT.COMPLETED,
    };
    if (eventMap[newStatus]) {
      await this.domainEvents.publish({
        orgId,
        eventType: eventMap[newStatus],
        aggregateId: eventId,
        aggregateType: 'Event',
        payload: {
          title: event.title,
          eventType: event.eventType,
          targetBranches: event.targetBranches,
        },
        actorUserId,
      });
    }

    return updated;
  }

  // ── Registration ──

  async register(orgId: string, eventId: string, memberId: string) {
    const event = await this.findById(orgId, eventId);
    if (!['registration_open', 'approved'].includes(event.status)) {
      throw new BadRequestException('Registration not open');
    }
    if (event.maxParticipants && event.registrations.length >= event.maxParticipants) {
      throw new BadRequestException('Event is full');
    }

    return this.prisma.eventRegistration.create({
      data: { orgId, eventId, orgMemberId: memberId, status: 'registered' },
    });
  }

  async signConsent(
    orgId: string,
    eventId: string,
    memberId: string,
    consentBy: string,
    signerMemberId: string,
    actorUserId: string,
    actorRole?: string,
  ) {
    await this.assertCanSignConsent(orgId, memberId, signerMemberId, actorRole);
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { eventId_orgMemberId: { eventId, orgMemberId: memberId } },
    });
    if (!reg) throw new NotFoundException('Registration not found');

    const updated = await this.prisma.eventRegistration.update({
      where: { id: reg.id },
      data: { consentSigned: true, consentDate: new Date(), consentBy },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.EVENT.CONSENT_RECEIVED,
      aggregateId: eventId,
      aggregateType: 'Event',
      payload: { memberId, consentBy },
      actorUserId,
    });

    return updated;
  }

  async checkIn(orgId: string, eventId: string, memberId: string, actorUserId: string) {
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { eventId_orgMemberId: { eventId, orgMemberId: memberId } },
    });
    if (!reg) throw new NotFoundException('Registration not found');

    const updated = await this.prisma.eventRegistration.update({
      where: { id: reg.id },
      data: { checkInTime: new Date(), status: 'checked_in' },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.EVENT.CHECKED_IN,
      aggregateId: eventId,
      aggregateType: 'Event',
      payload: { memberId },
      actorUserId,
    });

    return updated;
  }

  // ── Safety gates (P0: 2-adult rule) ──

  private validateSafetyGates(event: {
    raciMatrix: Prisma.JsonValue;
    safetyChecklist: Prisma.JsonValue;
  }) {
    const raci = event.raciMatrix as Record<string, unknown> | null;
    if (!raci) {
      throw new BadRequestException('RACI matrix is required before go-live');
    }

    const checklist = event.safetyChecklist as Record<string, boolean> | null;
    if (!checklist?.['two_adult_rule']) {
      throw new BadRequestException(
        '2-adult rule must be confirmed in safety checklist before go-live',
      );
    }
  }

  private async assertCanSignConsent(
    orgId: string,
    memberId: string,
    signerMemberId: string,
    actorRole?: string,
  ) {
    if (memberId === signerMemberId) return;
    if (actorRole === 'admin' || actorRole === 'super_admin') return;

    const child = await this.prisma.orgMember.findFirst({
      where: { id: memberId, orgId },
      select: { linkedMemberId: true },
    });
    if (child?.linkedMemberId === signerMemberId) return;

    const [guardianLink, signer] = await Promise.all([
      this.prisma.guardianLink.findFirst({
        where: { orgMemberId: memberId, orgId, consentSigned: true },
        select: { email: true },
      }),
      this.prisma.orgMember.findFirst({
        where: { id: signerMemberId, orgId },
        include: { user: { select: { email: true } } },
      }),
    ]);

    if (guardianLink?.email && signer?.user?.email && guardianLink.email === signer.user.email) {
      return;
    }

    throw new BadRequestException('Signer is not authorized to consent for this member');
  }
}
