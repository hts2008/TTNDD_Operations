import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { NotificationsService } from '../notifications/notifications.service';
import { DOMAIN_EVENTS } from '@ttndd/constants';

const DESIGNATED_ROLES = ['super_admin', 'admin'];
const RETENTION_DAYS = 90;
const QUIET_HOUR_START = 22;
const QUIET_HOUR_END = 7;

@Injectable()
export class ChildSafetyService {
  private readonly logger = new Logger(ChildSafetyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async reportIncident(
    orgId: string,
    data: {
      title: string;
      description?: string;
      category?: string;
      isAnonymous?: boolean;
      evidenceUrls?: string[];
    },
    actorUserId: string,
  ) {
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
      data: {
        ticketId: ticket.id,
        fromStatus: null,
        toStatus: 'open',
        changedBy: data.isAnonymous ? null : actorUserId,
      },
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

    // T-1055: Notify designated personnel about new incident
    await this.notifyDesignatedPersonnel(orgId, {
      title: `🚨 Sự cố mới: ${ticketNumber}`,
      body: `Sự cố "${data.title}" đã được báo cáo${data.isAnonymous ? ' (ẩn danh)' : ''}. Mức độ: Khẩn cấp.`,
      type: 'incident_reported',
      actionUrl: `/child-safety/${ticket.id}`,
    });

    return ticket;
  }

  async findIncidents(orgId: string, userRole: string, page = 1, limit = 20) {
    if (!DESIGNATED_ROLES.includes(userRole)) {
      // T-1052: Audit access-denied attempts for security telemetry
      this.logger.warn(
        `ACCESS DENIED: Non-designated role "${userRole}" attempted to view incidents for org ${orgId}`,
      );
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
      // T-1052: Audit access-denied attempts
      this.logger.warn(
        `ACCESS DENIED: Non-designated role "${userRole}" attempted to view incident ${ticketId}`,
      );
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

    // T-1055: Notify designated personnel about escalation
    await this.notifyDesignatedPersonnel(orgId, {
      title: `⬆️ Sự cố leo thang: ${ticket.ticketNumber}`,
      body: `Sự cố "${ticket.title}" đã được nâng lên cấp ${level}. Cần xử lý khẩn cấp.`,
      type: 'incident_escalated',
      actionUrl: `/child-safety/${ticketId}`,
    });

    return updated;
  }

  async addEvidence(
    orgId: string,
    ticketId: string,
    evidence: { urls: string[]; notes?: string },
    actorUserId: string,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, orgId, isSensitive: true },
    });
    if (!ticket) throw new NotFoundException('Incident not found');

    const fields = (ticket.customFields as Record<string, unknown>) ?? {};
    const existing = (fields.evidenceUrls as string[]) ?? [];

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        customFields: {
          ...fields,
          evidenceUrls: [...existing, ...evidence.urls],
          lastEvidenceAddedAt: new Date().toISOString(),
        },
      },
    });

    // T-1055: Audit log for evidence addition
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'incident.evidence_added',
      resource: 'Ticket',
      resourceId: ticketId,
      newValue: { evidenceCount: [...existing, ...evidence.urls].length, notes: evidence.notes },
    });

    return updated;
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

  // T-1055: Evidence retention policy with notification
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
      select: { id: true, ticketNumber: true },
    });

    for (const t of expired) {
      await this.prisma.ticket.update({
        where: { id: t.id },
        data: {
          description: '[REDACTED — retention policy applied]',
          customFields: { redactedAt: new Date().toISOString(), evidenceUrls: [] },
        },
      });

      await this.audit.log({
        orgId,
        action: 'incident.retention_applied',
        resource: 'Ticket',
        resourceId: t.id,
        newValue: { retentionDays: RETENTION_DAYS, redactedAt: new Date().toISOString() },
      });
    }

    // T-1055: Notify super_admin about retention policy execution
    if (expired.length > 0) {
      const superAdmins = await this.getDesignatedUserIds(orgId, ['super_admin']);
      if (superAdmins.length > 0) {
        await this.notifications.sendBulk(orgId, superAdmins, {
          title: '🗃️ Chính sách lưu trữ bằng chứng đã thực thi',
          body: `${expired.length} sự cố đã bị xóa dữ liệu theo chính sách lưu trữ ${RETENTION_DAYS} ngày.`,
          type: 'retention_policy_applied',
          actionUrl: '/child-safety',
        });
      }
    }

    return { redactedCount: expired.length };
  }

  // T-1055: Get retention status for dashboard
  async getRetentionStatus(orgId: string) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    const [totalSensitive, closedExpiring, alreadyRedacted] = await Promise.all([
      this.prisma.ticket.count({ where: { orgId, isSensitive: true } }),
      this.prisma.ticket.count({
        where: { orgId, isSensitive: true, status: 'closed', updatedAt: { lt: cutoff } },
      }),
      this.prisma.ticket.count({
        where: {
          orgId,
          isSensitive: true,
          description: '[REDACTED — retention policy applied]',
        },
      }),
    ]);

    return {
      retentionDays: RETENTION_DAYS,
      totalSensitiveTickets: totalSensitive,
      pendingRedaction: closedExpiring,
      alreadyRedacted,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  // ── T-1055: Notification Helpers ──

  private async notifyDesignatedPersonnel(
    orgId: string,
    data: { title: string; body: string; type: string; actionUrl: string },
  ) {
    try {
      const recipientIds = await this.getDesignatedUserIds(orgId);
      if (recipientIds.length === 0) {
        this.logger.warn(`No designated personnel found for org ${orgId} — notification skipped`);
        return;
      }
      await this.notifications.sendBulk(orgId, recipientIds, {
        title: data.title,
        body: data.body,
        type: data.type,
        actionUrl: data.actionUrl,
      });
      this.logger.debug(`Notified ${recipientIds.length} designated personnel: ${data.type}`);
    } catch (e) {
      this.logger.error(`Failed to notify designated personnel: ${(e as Error).message}`);
    }
  }

  private async getDesignatedUserIds(
    orgId: string,
    roles: string[] = DESIGNATED_ROLES,
  ): Promise<string[]> {
    const members = await this.prisma.orgMember.findMany({
      where: { orgId, role: { in: roles } },
      select: { id: true },
    });
    return members.map((m) => m.id);
  }
}
