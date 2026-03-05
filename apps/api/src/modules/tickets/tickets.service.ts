import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';

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
    const newStatus = allowed[action];

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
    if (eventMap[newStatus]) {
      await this.domainEvents.publish({
        orgId,
        eventType: eventMap[newStatus]!,
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
}
