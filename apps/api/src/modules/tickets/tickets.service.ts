import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import { ALL_TICKET_CATEGORIES, HR_TICKET_CATEGORIES, GENERAL_TICKET_CATEGORIES } from './hr-ticket-categories';

/**
 * SM-5: Ticket Lifecycle
 * open → assigned → in_progress → resolved → closed
 */
const TICKET_TRANSITIONS: Record<string, Record<string, string>> = {
  open: { assign: 'assigned', close: 'closed' },
  assigned: { start: 'in_progress', reassign: 'assigned', close: 'closed' },
  in_progress: { resolve: 'resolved', reassign: 'assigned' },
  resolved: { close: 'closed', reopen: 'open' },
  closed: { reopen: 'open' },
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── Ticket CRUD ──

  async createTicket(orgId: string, data: {
    title: string; description?: string; category?: string;
    priority?: string; requesterId: string; assigneeId?: string;
    dueDate?: string; tags?: string[]; customFields?: Prisma.InputJsonValue;
    isSensitive?: boolean; isAnonymous?: boolean;
  }, actorUserId: string) {
    const ticketNumber = await this.generateTicketNumber(orgId);

    const ticket = await this.prisma.ticket.create({
      data: {
        orgId,
        ticketNumber,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        requesterId: data.requesterId,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        tags: data.tags ?? [],
        customFields: data.customFields ?? {},
        isSensitive: data.isSensitive ?? false,
        isAnonymous: data.isAnonymous ?? false,
      },
    });

    // T-0147: Auto-routing — apply routing rules if no assignee was provided
    if (!data.assigneeId) {
      const routing = await this.evaluateRouting(orgId, {
        category: ticket.category,
        priority: ticket.priority,
        tags: ticket.tags,
        title: ticket.title,
      });

      if (routing) {
        const updateData: Prisma.TicketUpdateInput = {};
        if (routing.assigneeId) updateData.assigneeId = routing.assigneeId;
        if (routing.setPriority) updateData.priority = routing.setPriority;
        if (routing.setCategory) updateData.category = routing.setCategory;
        if (routing.addTags?.length) {
          updateData.tags = [...new Set([...ticket.tags, ...routing.addTags])];
        }

        if (Object.keys(updateData).length > 0) {
          await this.prisma.ticket.update({ where: { id: ticket.id }, data: updateData });
        }

        if (routing.assigneeId) {
          await this.recordStatusHistory(ticket.id, 'open', 'assigned', 'system',
            `Auto-routed by rule "${routing.matchedRuleName}"`);
        }
      }
    }

    await this.recordStatusHistory(ticket.id, null, 'open', actorUserId);

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.TICKET.CREATED,
      aggregateId: ticket.id,
      aggregateType: 'Ticket',
      payload: { ticketNumber, title: data.title, priority: data.priority ?? 'medium', isSensitive: data.isSensitive ?? false },
      actorUserId,
    });

    return ticket;
  }

  async findTickets(orgId: string, filters?: {
    status?: string; priority?: string; category?: string;
    assigneeId?: string; requesterId?: string; isSensitive?: boolean;
  }, page = 1, limit = 20) {
    const where: Prisma.TicketWhereInput = { orgId };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.category) where.category = filters.category;
    if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters?.requesterId) where.requesterId = filters.requesterId;
    if (filters?.isSensitive !== undefined) where.isSensitive = filters.isSensitive;

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: { _count: { select: { comments: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findById(orgId: string, ticketId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, orgId },
      include: {
        comments: { orderBy: { createdAt: 'asc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  // ── State Machine ──

  async transitionTicket(orgId: string, ticketId: string, action: string, actorUserId: string, data?: {
    assigneeId?: string; approvalNotes?: string;
  }) {
    const ticket = await this.findById(orgId, ticketId);
    const allowed = TICKET_TRANSITIONS[ticket.status];
    if (!allowed?.[action]) {
      throw new BadRequestException(`Action '${action}' not allowed from '${ticket.status}'`);
    }
    const newStatus = allowed[action] as string;

    const updateData: Prisma.TicketUpdateInput = { status: newStatus };
    if ((action === 'assign' || action === 'reassign') && data?.assigneeId) {
      updateData.assigneeId = data.assigneeId;
    }
    if (action === 'resolve') {
      updateData.resolvedAt = new Date();
      if (data?.approvalNotes) updateData.approvalNotes = data.approvalNotes;
    }

    const updated = await this.prisma.ticket.update({ where: { id: ticketId }, data: updateData });

    await this.recordStatusHistory(ticketId, ticket.status, newStatus, actorUserId, data?.approvalNotes);

    const eventMap: Record<string, string | undefined> = {
      assigned: DOMAIN_EVENTS.TICKET.ASSIGNED,
      resolved: DOMAIN_EVENTS.TICKET.RESOLVED,
      closed: DOMAIN_EVENTS.TICKET.CLOSED,
    };
    const eventType = eventMap[newStatus];
    if (eventType) {
      await this.domainEvents.publish({
        orgId,
        eventType,
        aggregateId: ticketId,
        aggregateType: 'Ticket',
        payload: { ticketNumber: ticket.ticketNumber, newStatus, assigneeId: data?.assigneeId },
        actorUserId,
      });
    }

    return updated;
  }

  // ── Comments ──

  async addComment(orgId: string, ticketId: string, data: {
    content: string; isInternal?: boolean; attachments?: Prisma.InputJsonValue;
  }, actorUserId: string) {
    await this.findById(orgId, ticketId);

    const comment = await this.prisma.ticketComment.create({
      data: {
        orgId,
        ticketId,
        authorId: actorUserId,
        content: data.content,
        isInternal: data.isInternal ?? false,
        attachments: data.attachments ?? [],
      },
    });

    return comment;
  }

  async getComments(orgId: string, ticketId: string) {
    await this.findById(orgId, ticketId);
    return this.prisma.ticketComment.findMany({
      where: { orgId, ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Helpers ──

  private async generateTicketNumber(orgId: string): Promise<string> {
    const count = await this.prisma.ticket.count({ where: { orgId } });
    return `TK-${String(count + 1).padStart(5, '0')}`;
  }

  private async recordStatusHistory(ticketId: string, fromStatus: string | null, toStatus: string, changedBy: string, notes?: string) {
    await this.prisma.ticketStatusHistory.create({
      data: {
        ticketId,
        fromStatus,
        toStatus,
        changedBy,
        notes,
      },
    });
  }

  // ── T-0070: HR Helpdesk Ticket Categories ──

  getCategories(group?: 'hr' | 'general' | 'all') {
    switch (group) {
      case 'hr':
        return HR_TICKET_CATEGORIES;
      case 'general':
        return GENERAL_TICKET_CATEGORIES;
      default:
        return ALL_TICKET_CATEGORIES;
    }
  }

  // ── T-0147: Routing Rules CRUD ──

  async createRoutingRule(orgId: string, data: {
    name: string; description?: string; matchMode?: string;
    conditions: { field: string; operator: string; value: string | string[] }[];
    assignToUserId?: string; assignToTeam?: string;
    setPriority?: string; addTags?: string[]; setCategory?: string;
    priority?: number;
  }, actorUserId: string) {
    return this.prisma.ticketRoutingRule.create({
      data: {
        orgId,
        name: data.name,
        description: data.description,
        matchMode: data.matchMode ?? 'any',
        conditions: data.conditions as unknown as Prisma.InputJsonValue,
        assignToUserId: data.assignToUserId,
        assignToTeam: data.assignToTeam,
        setPriority: data.setPriority,
        addTags: data.addTags ?? [],
        setCategory: data.setCategory,
        priority: data.priority ?? 0,
        createdBy: actorUserId,
      },
    });
  }

  async findRoutingRules(orgId: string, activeOnly = true) {
    return this.prisma.ticketRoutingRule.findMany({
      where: { orgId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { priority: 'desc' },
    });
  }

  async updateRoutingRule(orgId: string, ruleId: string, data: Partial<{
    name: string; description: string; isActive: boolean; matchMode: string;
    conditions: { field: string; operator: string; value: string | string[] }[];
    assignToUserId: string | null; assignToTeam: string | null;
    setPriority: string | null; addTags: string[]; setCategory: string | null;
    priority: number;
  }>) {
    return this.prisma.ticketRoutingRule.update({
      where: { id: ruleId },
      data: {
        ...data,
        conditions: data.conditions
          ? (data.conditions as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async deleteRoutingRule(orgId: string, ruleId: string) {
    return this.prisma.ticketRoutingRule.delete({ where: { id: ruleId } });
  }

  // ── T-0147: Auto-Routing Evaluator ──

  async evaluateRouting(orgId: string, ticket: {
    category?: string | null; priority: string; tags: string[]; title: string;
  }): Promise<{
    assigneeId?: string; assignToTeam?: string;
    setPriority?: string; addTags?: string[]; setCategory?: string;
    matchedRuleId?: string; matchedRuleName?: string;
  } | null> {
    const rules = await this.findRoutingRules(orgId, true);

    for (const rule of rules) {
      const conditions = rule.conditions as unknown as { field: string; operator: string; value: string | string[] }[];
      if (!conditions.length) continue;

      const results = conditions.map((cond) => this.evaluateCondition(cond, ticket));
      const matched = rule.matchMode === 'all' ? results.every(Boolean) : results.some(Boolean);

      if (matched) {
        return {
          assigneeId: rule.assignToUserId ?? undefined,
          assignToTeam: rule.assignToTeam ?? undefined,
          setPriority: rule.setPriority ?? undefined,
          addTags: rule.addTags.length > 0 ? rule.addTags : undefined,
          setCategory: rule.setCategory ?? undefined,
          matchedRuleId: rule.id,
          matchedRuleName: rule.name,
        };
      }
    }

    return null;
  }

  private evaluateCondition(
    cond: { field: string; operator: string; value: string | string[] },
    ticket: { category?: string | null; priority: string; tags: string[]; title: string },
  ): boolean {
    const fieldValue = this.getTicketFieldValue(cond.field, ticket);
    const { operator, value } = cond;

    switch (operator) {
      case 'eq':
        return typeof fieldValue === 'string' && fieldValue === value;
      case 'neq':
        return typeof fieldValue === 'string' && fieldValue !== value;
      case 'contains':
        return typeof fieldValue === 'string' && typeof value === 'string'
          && fieldValue.toLowerCase().includes(value.toLowerCase());
      case 'in':
        return Array.isArray(value)
          ? value.includes(fieldValue as string)
          : false;
      case 'has_tag':
        return Array.isArray(ticket.tags) && typeof value === 'string'
          && ticket.tags.includes(value);
      default:
        return false;
    }
  }

  private getTicketFieldValue(
    field: string,
    ticket: { category?: string | null; priority: string; tags: string[]; title: string },
  ): string | string[] | undefined {
    switch (field) {
      case 'category': return ticket.category ?? undefined;
      case 'priority': return ticket.priority;
      case 'tags': return ticket.tags;
      case 'title': return ticket.title;
      default: return undefined;
    }
  }

  // ── T-0149: SLA Config CRUD ──

  async createSlaConfig(orgId: string, data: {
    name: string; priority: string;
    responseTimeHours: number; resolutionTimeHours: number;
    escalateToUserId?: string; escalateToTeam?: string;
  }) {
    return this.prisma.ticketSlaConfig.create({
      data: {
        orgId,
        name: data.name,
        priority: data.priority,
        responseTimeHours: data.responseTimeHours,
        resolutionTimeHours: data.resolutionTimeHours,
        escalateToUserId: data.escalateToUserId,
        escalateToTeam: data.escalateToTeam,
      },
    });
  }

  async findSlaConfigs(orgId: string) {
    return this.prisma.ticketSlaConfig.findMany({
      where: { orgId, isActive: true },
      orderBy: { priority: 'asc' },
    });
  }

  async updateSlaConfig(orgId: string, configId: string, data: Partial<{
    name: string; responseTimeHours: number; resolutionTimeHours: number;
    escalateToUserId: string | null; escalateToTeam: string | null;
    isActive: boolean;
  }>) {
    return this.prisma.ticketSlaConfig.update({
      where: { id: configId },
      data,
    });
  }

  // ── T-0149: SLA Breach Checker ──

  async checkSlaBreaches(orgId: string): Promise<{
    breached: { ticketId: string; ticketNumber: string; type: 'response' | 'resolution'; hoursOverdue: number }[];
    atRisk: { ticketId: string; ticketNumber: string; type: 'response' | 'resolution'; hoursRemaining: number }[];
  }> {
    const [slaConfigs, openTickets] = await Promise.all([
      this.findSlaConfigs(orgId),
      this.prisma.ticket.findMany({
        where: { orgId, status: { in: ['open', 'assigned', 'in_progress'] } },
        select: { id: true, ticketNumber: true, priority: true, status: true, createdAt: true, assigneeId: true },
      }),
    ]);

    const slaByPriority = new Map(slaConfigs.map(c => [c.priority, c]));
    const now = new Date();
    const breached: { ticketId: string; ticketNumber: string; type: 'response' | 'resolution'; hoursOverdue: number }[] = [];
    const atRisk: { ticketId: string; ticketNumber: string; type: 'response' | 'resolution'; hoursRemaining: number }[] = [];

    for (const ticket of openTickets) {
      const sla = slaByPriority.get(ticket.priority);
      if (!sla) continue;

      const ageHours = (now.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);

      // Response SLA: ticket still 'open' (unassigned)
      if (ticket.status === 'open') {
        const responseDeadline = sla.responseTimeHours;
        if (ageHours > responseDeadline) {
          breached.push({ ticketId: ticket.id, ticketNumber: ticket.ticketNumber, type: 'response', hoursOverdue: Math.round(ageHours - responseDeadline) });
        } else if (ageHours > responseDeadline * 0.8) {
          atRisk.push({ ticketId: ticket.id, ticketNumber: ticket.ticketNumber, type: 'response', hoursRemaining: Math.round(responseDeadline - ageHours) });
        }
      }

      // Resolution SLA: ticket not yet resolved
      const resolutionDeadline = sla.resolutionTimeHours;
      if (ageHours > resolutionDeadline) {
        breached.push({ ticketId: ticket.id, ticketNumber: ticket.ticketNumber, type: 'resolution', hoursOverdue: Math.round(ageHours - resolutionDeadline) });
      } else if (ageHours > resolutionDeadline * 0.8) {
        atRisk.push({ ticketId: ticket.id, ticketNumber: ticket.ticketNumber, type: 'resolution', hoursRemaining: Math.round(resolutionDeadline - ageHours) });
      }
    }

    return { breached, atRisk };
  }

  // ── T-0149: Auto-Escalation ──

  async escalateBreachedTickets(orgId: string, actorUserId: string): Promise<{ escalatedCount: number; escalatedIds: string[] }> {
    const { breached } = await this.checkSlaBreaches(orgId);
    const slaConfigs = await this.findSlaConfigs(orgId);
    const escalatedIds: string[] = [];

    for (const item of breached) {
      const ticket = await this.prisma.ticket.findUnique({ where: { id: item.ticketId }, select: { priority: true, status: true } });
      if (!ticket) continue;

      const sla = slaConfigs.find(c => c.priority === ticket.priority);
      if (!sla?.escalateToUserId && !sla?.escalateToTeam) continue;

      const updateData: Prisma.TicketUpdateInput = {};
      if (sla.escalateToUserId) {
        updateData.assigneeId = sla.escalateToUserId;
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.ticket.update({ where: { id: item.ticketId }, data: updateData });
        await this.recordStatusHistory(item.ticketId, ticket.status, ticket.status, actorUserId,
          `SLA breached (${item.type}, ${item.hoursOverdue}h overdue) — escalated`);
        escalatedIds.push(item.ticketId);
      }
    }

    return { escalatedCount: escalatedIds.length, escalatedIds };
  }

  // ── T-0150: Ticket Attachment CRUD ──

  async addAttachment(orgId: string, ticketId: string, data: {
    fileName: string; fileUrl: string; fileSize?: number; mimeType?: string;
  }, actorUserId: string) {
    await this.findById(orgId, ticketId);

    const attachment = await this.prisma.ticketAttachment.create({
      data: {
        orgId,
        ticketId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedBy: actorUserId,
      },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'ticket.attachment_added',
      resource: 'TicketAttachment', resourceId: attachment.id,
      newValue: { ticketId, fileName: data.fileName } as unknown as Prisma.InputJsonValue,
    });

    return attachment;
  }

  async findAttachments(orgId: string, ticketId: string) {
    await this.findById(orgId, ticketId);
    return this.prisma.ticketAttachment.findMany({
      where: { orgId, ticketId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAttachment(orgId: string, attachmentId: string, actorUserId: string) {
    const attachment = await this.prisma.ticketAttachment.findFirst({
      where: { id: attachmentId, orgId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    await this.prisma.ticketAttachment.delete({ where: { id: attachmentId } });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'ticket.attachment_deleted',
      resource: 'TicketAttachment', resourceId: attachmentId,
      newValue: { ticketId: attachment.ticketId, fileName: attachment.fileName } as unknown as Prisma.InputJsonValue,
    });

    return { deleted: true };
  }

  // ── T-0150: Ticket Audit Trail ──

  async getAuditTrail(orgId: string, ticketId: string) {
    await this.findById(orgId, ticketId);

    const [statusHistory, comments, attachments] = await Promise.all([
      this.prisma.ticketStatusHistory.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.ticketComment.findMany({
        where: { orgId, ticketId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.ticketAttachment.findMany({
        where: { orgId, ticketId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Merge into unified timeline sorted by date
    type TimelineEntry = { type: string; timestamp: Date; data: Record<string, unknown> };
    const timeline: TimelineEntry[] = [
      ...statusHistory.map((h) => ({
        type: 'status_change' as const,
        timestamp: h.createdAt,
        data: { fromStatus: h.fromStatus, toStatus: h.toStatus, changedBy: h.changedBy, notes: h.notes },
      })),
      ...comments.map((c) => ({
        type: 'comment' as const,
        timestamp: c.createdAt,
        data: { authorId: c.authorId, content: c.content, isInternal: c.isInternal },
      })),
      ...attachments.map((a) => ({
        type: 'attachment' as const,
        timestamp: a.createdAt,
        data: { fileName: a.fileName, fileUrl: a.fileUrl, uploadedBy: a.uploadedBy },
      })),
    ];

    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return { ticketId, timeline };
  }
}
