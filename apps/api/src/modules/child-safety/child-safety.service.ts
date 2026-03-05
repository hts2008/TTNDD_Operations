import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';

const DESIGNATED_ROLES = ['super_admin', 'admin'];
const RETENTION_DAYS = 90;
const QUIET_HOUR_START = 22;
const QUIET_HOUR_END = 7;

@Injectable()
export class ChildSafetyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  async reportIncident(orgId: string, data: {
    title: string; description?: string; category?: string;
    isAnonymous?: boolean; evidenceUrls?: string[];
  }, actorUserId: string) {
    const count = await this.prisma.ticket.count({ where: { orgId } });
    const ticketNumber = `INC-${String(count + 1).padStart(5, '0')}`;

    const ticket = await this.prisma.ticket.create({
      data: {
        orgId,
        ticketNumber,
        title: data.title,
        description: data.description,
        category: data.category ?? 'child_safety_incident',
        priority: 'critical',
        status: 'open',
        requesterId: actorUserId,
        isSensitive: true,
        isAnonymous: data.isAnonymous ?? false,
        customFields: {
          evidenceUrls: data.evidenceUrls ?? [],
          reportedAt: new Date().toISOString(),
          retentionDays: RETENTION_DAYS,
          escalationLevel: 0,
        },
      },
    });

    await this.prisma.ticketStatusHistory.create({
      data: { ticketId: ticket.id, fromStatus: null, toStatus: 'open', changedBy: data.isAnonymous ? null : actorUserId },
    });

    await this.audit.log({
      orgId,
      userId: data.isAnonymous ? undefined : actorUserId,
      action: 'incident.reported',
      resource: 'Ticket',
      resourceId: ticket.id,
      newValue: { ticketNumber, isSensitive: true, isAnonymous: data.isAnonymous },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.TICKET.CREATED,
      aggregateId: ticket.id,
      aggregateType: 'Ticket',
      payload: { ticketNumber, priority: 'critical', isSensitive: true },
      actorUserId,
    });

    return ticket;
  }

  async findIncidents(orgId: string, userRole: string, page = 1, limit = 20) {
    if (!DESIGNATED_ROLES.includes(userRole)) {
      throw new ForbiddenException('Only designated personnel can view incident reports');
    }

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { orgId, isSensitive: true },
        include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticket.count({ where: { orgId, isSensitive: true } }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async getIncident(orgId: string, ticketId: string, userRole: string) {
    if (!DESIGNATED_ROLES.includes(userRole)) {
      throw new ForbiddenException('Only designated personnel can view incident details');
    }
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, orgId, isSensitive: true },
      include: {
        comments: { orderBy: { createdAt: 'asc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Incident not found');
    return ticket;
  }

  async escalateIncident(orgId: string, ticketId: string, actorUserId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, orgId, isSensitive: true },
    });
    if (!ticket) throw new NotFoundException('Incident not found');

    const fields = (ticket.customFields as Record<string, unknown>) ?? {};
    const level = ((fields.escalationLevel as number) ?? 0) + 1;

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        customFields: { ...fields, escalationLevel: level, escalatedAt: new Date().toISOString() },
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'incident.escalated',
      resource: 'Ticket',
      resourceId: ticketId,
      newValue: { escalationLevel: level },
    });

    return updated;
  }

  async addEvidence(orgId: string, ticketId: string, evidence: { urls: string[]; notes?: string }, actorUserId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, orgId, isSensitive: true },
    });
    if (!ticket) throw new NotFoundException('Incident not found');

    const fields = (ticket.customFields as Record<string, unknown>) ?? {};
    const existing = (fields.evidenceUrls as string[]) ?? [];

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        customFields: {
          ...fields,
          evidenceUrls: [...existing, ...evidence.urls],
          lastEvidenceAddedAt: new Date().toISOString(),
        },
      },
    });
  }

  async exportForCouncil(orgId: string, ticketId: string, userRole: string) {
    if (!DESIGNATED_ROLES.includes(userRole)) {
      throw new ForbiddenException('Only designated personnel can export incident reports');
    }
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, orgId, isSensitive: true },
      include: {
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Incident not found');

    return {
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.isAnonymous ? '[ANONYMOUS REPORT]' : ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      timeline: ticket.statusHistory,
      createdAt: ticket.createdAt,
    };
  }

  validate2AdultRule(staffCount: number): boolean {
    return staffCount >= 2;
  }

  isQuietHours(): boolean {
    const hour = new Date().getHours();
    return hour >= QUIET_HOUR_START || hour < QUIET_HOUR_END;
  }

  async applyRetentionPolicy(orgId: string) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    const expired = await this.prisma.ticket.findMany({
      where: {
        orgId,
        isSensitive: true,
        status: 'closed',
        updatedAt: { lt: cutoff },
      },
      select: { id: true },
    });

    for (const t of expired) {
      await this.prisma.ticket.update({
        where: { id: t.id },
        data: {
          description: '[REDACTED — retention policy applied]',
          customFields: { redactedAt: new Date().toISOString(), evidenceUrls: [] },
        },
      });
    }

    return { redactedCount: expired.length };
  }
}
