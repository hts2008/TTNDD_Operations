import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';

/** SM-5: Ticket Lifecycle */
const TICKET_TRANSITIONS: Record<string, Record<string, string>> = {
  open: { assign: 'assigned', close: 'closed' },
  assigned: { start: 'in_progress', reassign: 'assigned', close: 'closed' },
  in_progress: { resolve: 'resolved', reassign: 'assigned' },
  resolved: { close: 'closed', reopen: 'open' },
  closed: { reopen: 'open' },
};

/** T-1044: SLA targets per priority (hours) */
const SLA_TARGETS: Record<string, { firstResponse: number; resolution: number }> = {
  critical: { firstResponse: 1, resolution: 4 },
  high: { firstResponse: 2, resolution: 8 },
  medium: { firstResponse: 4, resolution: 24 },
  low: { firstResponse: 8, resolution: 72 },
};

function toPositiveInt(value: number | string | undefined, fallback: number, max = 100) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.trunc(parsed), max);
}

/** T-1042: Category → default assignee role mapping */
const CATEGORY_ROUTING: Record<string, string> = {
  'Tài khoản': 'admin',
  'Kỹ thuật': 'tech_support',
  'Tài sản': 'asset_manager',
  'Tính năng': 'product_owner',
  'An toàn': 'safety_officer',
  'Tài chính': 'finance_admin',
};

/** T-1054: Guardian consent templates */
const CONSENT_TEMPLATES: Record<string, { title: string; description: string; category: string }> =
  {
    camp_consent: {
      title: 'Đồng ý cho con tham gia trại',
      description:
        'Phụ huynh xác nhận đồng ý cho con tham gia hoạt động trại. Vui lòng đính kèm giấy đồng ý đã ký.',
      category: 'Đồng ý phụ huynh',
    },
    medical_consent: {
      title: 'Đồng ý y tế',
      description: 'Phụ huynh cung cấp thông tin y tế và đồng ý cho phép xử lý y tế khẩn cấp.',
      category: 'Đồng ý phụ huynh',
    },
    photo_consent: {
      title: 'Đồng ý sử dụng hình ảnh',
      description: 'Phụ huynh đồng ý cho phép sử dụng hình ảnh con trong tài liệu hoạt động.',
      category: 'Đồng ý phụ huynh',
    },
  };

/** T-1048: Approval thresholds */
const APPROVAL_THRESHOLDS = {
  budget: { autoApproveLimit: 500000, escalateLimit: 5000000 },
};

type ApprovalStepInput = {
  stepName?: string;
  approverRole?: string;
  approverUserId?: string;
  dueInHours?: number;
};

type NormalizedApprovalStep = {
  stepOrder: number;
  stepName: string;
  approverRole?: string;
  approverUserId?: string;
  dueAt?: Date;
};

const MAX_APPROVAL_STEPS = 8;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── Ticket CRUD ──

  async createTicket(
    orgId: string,
    data: {
      title: string;
      description?: string;
      category?: string;
      priority?: string;
      requesterId: string;
      assigneeId?: string;
      dueDate?: string;
      tags?: string[];
      customFields?: Prisma.InputJsonValue;
      isSensitive?: boolean;
      isAnonymous?: boolean;
    },
    actorUserId: string,
  ) {
    const ticketNumber = await this.generateTicketNumber(orgId);
    const priority = data.priority ?? 'medium';

    // T-1044: Calculate SLA deadlines
    const sla = SLA_TARGETS[priority] ?? SLA_TARGETS['medium'];
    const now = new Date();
    const firstResponseDeadline = new Date(now.getTime() + sla!.firstResponse * 3600000);
    const resolutionDeadline = new Date(now.getTime() + sla!.resolution * 3600000);

    const ticket = await this.prisma.ticket.create({
      data: {
        orgId,
        ticketNumber,
        title: data.title,
        description: data.description,
        category: data.category,
        priority,
        requesterId: data.requesterId,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate ? new Date(data.dueDate) : resolutionDeadline,
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
      payload: {
        ticketNumber,
        title: data.title,
        priority,
        isSensitive: data.isSensitive ?? false,
        sla: {
          firstResponseDeadline: firstResponseDeadline.toISOString(),
          resolutionDeadline: resolutionDeadline.toISOString(),
        },
      },
      actorUserId,
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'ticket.created',
      resource: 'Ticket',
      resourceId: ticket.id,
    });
    return { ...ticket, sla: { firstResponseDeadline, resolutionDeadline } };
  }

  async findTickets(
    orgId: string,
    filters?: {
      status?: string;
      priority?: string;
      category?: string;
      assigneeId?: string;
      requesterId?: string;
      isSensitive?: boolean;
    },
    page: number | string = 1,
    limit: number | string = 20,
  ) {
    const currentPage = toPositiveInt(page, 1);
    const pageSize = toPositiveInt(limit, 20);
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
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return { data, meta: { total, page: currentPage, limit: pageSize } };
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

  // ── SM-5 State Machine ──

  async transitionTicket(
    orgId: string,
    ticketId: string,
    action: string,
    actorUserId: string,
    data?: {
      assigneeId?: string;
      approvalNotes?: string;
    },
  ) {
    const ticket = await this.findById(orgId, ticketId);
    const allowed = TICKET_TRANSITIONS[ticket.status];
    if (!allowed?.[action])
      throw new BadRequestException(`Action '${action}' not allowed from '${ticket.status}'`);
    const newStatus = allowed[action];
    const oldValue = { status: ticket.status };

    const updateData: Prisma.TicketUpdateInput = { status: newStatus };
    if ((action === 'assign' || action === 'reassign') && data?.assigneeId)
      updateData.assigneeId = data.assigneeId;
    if (action === 'resolve') {
      updateData.resolvedAt = new Date();
      if (data?.approvalNotes) updateData.approvalNotes = data.approvalNotes;
    }

    const updated = await this.prisma.ticket.update({ where: { id: ticketId }, data: updateData });
    await this.recordStatusHistory(
      ticketId,
      ticket.status,
      newStatus,
      actorUserId,
      data?.approvalNotes,
    );

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

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: `ticket.${action}`,
      resource: 'Ticket',
      resourceId: ticketId,
      oldValue,
      newValue: { status: newStatus },
    });
    return updated;
  }

  // ── T-1049/T-1053: Escalation ──

  async escalateTicket(orgId: string, ticketId: string, actorUserId: string, reason?: string) {
    const ticket = await this.findById(orgId, ticketId);
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      throw new BadRequestException('Cannot escalate a closed/resolved ticket');
    }

    const priorityLadder = ['low', 'medium', 'high', 'critical'];
    const currentIdx = priorityLadder.indexOf(ticket.priority);
    const newPriority =
      currentIdx < priorityLadder.length - 1 ? priorityLadder[currentIdx + 1] : 'critical';

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { priority: newPriority },
    });

    await this.addComment(
      orgId,
      ticketId,
      {
        content: `⬆️ Escalated: ${ticket.priority} → ${newPriority}${reason ? `. Lý do: ${reason}` : ''}`,
        isInternal: true,
      },
      actorUserId,
    );

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.TICKET.ASSIGNED,
      aggregateId: ticketId,
      aggregateType: 'Ticket',
      payload: {
        ticketNumber: ticket.ticketNumber,
        escalated: true,
        oldPriority: ticket.priority,
        newPriority,
        reason,
      },
      actorUserId,
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'ticket.escalated',
      resource: 'Ticket',
      resourceId: ticketId,
      oldValue: { priority: ticket.priority },
      newValue: { priority: newPriority, reason },
    });
    return updated;
  }

  // ── T-1046/T-1047/T-1048: Approval Engine (single-level) ──

  async requestApproval(
    orgId: string,
    ticketId: string,
    actorUserId: string,
    data: {
      approvalType: string;
      amount?: number;
      notes?: string;
      steps?: ApprovalStepInput[];
    },
  ) {
    const ticket = await this.findById(orgId, ticketId);

    // T-1048: Auto-approve if under threshold
    if (data.approvalType === 'budget' && data.amount !== undefined) {
      if (data.amount <= APPROVAL_THRESHOLDS.budget.autoApproveLimit) {
        await this.addComment(
          orgId,
          ticketId,
          {
            content: `✅ Tự động duyệt: ${data.approvalType} — ${data.amount.toLocaleString('vi-VN')} VND (dưới ngưỡng ${APPROVAL_THRESHOLDS.budget.autoApproveLimit.toLocaleString('vi-VN')} VND)`,
            isInternal: true,
          },
          actorUserId,
        );
        return { ticketId, approvalStatus: 'auto_approved', amount: data.amount };
      }
    }

    const existingPending = await this.prisma.approvalFlow.findFirst({
      where: { orgId, ticketId, status: 'pending' },
      select: { id: true },
    });
    if (existingPending) {
      throw new BadRequestException('A pending approval flow already exists');
    }

    const requestedAt = new Date();
    const approvalSteps = this.normalizeApprovalSteps(data.steps, requestedAt);
    const flow = await this.prisma.approvalFlow.create({
      data: {
        orgId,
        ticketId,
        approvalType: data.approvalType,
        amount: data.amount,
        status: 'pending',
        currentStepOrder: 1,
        requestedBy: actorUserId,
        requestedAt,
        slaDueAt: this.findLatestDueAt(approvalSteps),
        metadata: {
          notes: data.notes ?? null,
          legacySingleLevelDefault: !data.steps?.length,
        },
        steps: {
          create: approvalSteps.map((step) => ({
            orgId,
            stepOrder: step.stepOrder,
            stepName: step.stepName,
            approverRole: step.approverRole,
            approverUserId: step.approverUserId,
            status: 'pending',
            dueAt: step.dueAt,
          })),
        },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        customFields: {
          ...((ticket.customFields as Record<string, unknown>) ?? {}),
          approvalRequest: this.buildApprovalSnapshot(flow),
        },
      },
    });

    await this.addComment(
      orgId,
      ticketId,
      {
        content: `📋 Yêu cầu duyệt: ${data.approvalType}${data.amount ? ` — ${data.amount.toLocaleString('vi-VN')} VND` : ''}${data.notes ? `. Ghi chú: ${data.notes}` : ''}`,
        isInternal: true,
      },
      actorUserId,
    );

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'ticket.approval_requested',
      resource: 'Ticket',
      resourceId: ticketId,
      newValue: {
        ...data,
        flowId: flow.id,
        stepCount: flow.steps.length,
      } as unknown as Prisma.InputJsonValue,
    });
    return {
      ticketId,
      approvalStatus: 'pending',
      flowId: flow.id,
      currentStepOrder: flow.currentStepOrder,
      totalSteps: flow.steps.length,
      data,
    };
  }

  async getApprovalFlow(orgId: string, ticketId: string) {
    const ticket = await this.findById(orgId, ticketId);
    const flow = await this.prisma.approvalFlow.findFirst({
      where: { orgId, ticketId },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        decisions: { orderBy: { decidedAt: 'asc' } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    return {
      ticketId,
      flow: flow ? this.serializeApprovalFlow(flow) : null,
      legacyApprovalRequest: ((ticket.customFields as Record<string, unknown>) ?? {})
        .approvalRequest,
    };
  }

  async handleApproval(
    orgId: string,
    ticketId: string,
    actorUserId: string,
    decision: string,
    notes?: string,
    actorRole?: string,
  ) {
    const ticket = await this.findById(orgId, ticketId);
    const flow = await this.prisma.approvalFlow.findFirst({
      where: { orgId, ticketId, status: 'pending' },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        decisions: { orderBy: { decidedAt: 'asc' } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    if (flow) {
      return this.handleApprovalFlow(
        orgId,
        ticketId,
        ticket,
        flow,
        actorUserId,
        decision,
        notes,
        actorRole,
      );
    }

    const normalizedDecision = this.normalizeDecision(decision);
    const cf = (ticket.customFields as Record<string, unknown>) ?? {};
    const approval = cf.approvalRequest as Record<string, unknown> | undefined;
    if (!approval || approval.status !== 'pending')
      throw new BadRequestException('No pending approval request');

    approval.status = normalizedDecision;
    approval.decidedBy = actorUserId;
    approval.decidedAt = new Date().toISOString();
    approval.decisionNotes = notes;

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { customFields: cf as Prisma.InputJsonValue },
    });

    const emoji = decision === 'approve' ? '✅' : '❌';
    await this.addComment(
      orgId,
      ticketId,
      {
        content: `${emoji} ${decision === 'approve' ? 'Đã duyệt' : 'Từ chối'}${notes ? `: ${notes}` : ''}`,
        isInternal: true,
      },
      actorUserId,
    );

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: `ticket.approval_${decision}`,
      resource: 'Ticket',
      resourceId: ticketId,
      newValue: { decision: normalizedDecision, notes },
    });
    return { ticketId, approvalStatus: approval.status };
  }

  // ── T-1054: Guardian Consent Templates ──

  private async handleApprovalFlow(
    orgId: string,
    ticketId: string,
    ticket: { customFields: Prisma.JsonValue },
    flow: {
      id: string;
      approvalType: string;
      amount: unknown;
      status: string;
      currentStepOrder: number;
      requestedBy: string;
      requestedAt: Date;
      completedAt: Date | null;
      slaDueAt: Date | null;
      metadata: Prisma.JsonValue;
      steps: Array<{
        id: string;
        orgId: string;
        flowId: string;
        stepOrder: number;
        stepName: string;
        approverRole: string | null;
        approverUserId: string | null;
        status: string;
        dueAt: Date | null;
        decidedAt: Date | null;
      }>;
      decisions?: unknown[];
    },
    actorUserId: string,
    decision: string,
    notes?: string,
    actorRole?: string,
  ) {
    const normalizedDecision = this.normalizeDecision(decision);
    const currentStep =
      flow.steps.find(
        (step) => step.stepOrder === flow.currentStepOrder && step.status === 'pending',
      ) ?? flow.steps.find((step) => step.status === 'pending');
    if (!currentStep) throw new BadRequestException('No pending approval step');

    this.assertCanDecideStep(currentStep, actorUserId, actorRole);

    const decidedAt = new Date();
    await this.prisma.approvalDecision.create({
      data: {
        orgId,
        flowId: flow.id,
        stepId: currentStep.id,
        decision: normalizedDecision,
        notes,
        decidedBy: actorUserId,
        decidedAt,
      },
    });

    await this.prisma.approvalStep.update({
      where: { id: currentStep.id },
      data: { status: normalizedDecision, decidedAt },
    });

    const updatedSteps = flow.steps.map((step) =>
      step.id === currentStep.id ? { ...step, status: normalizedDecision, decidedAt } : step,
    );
    const nextStep = updatedSteps.find(
      (step) => step.status === 'pending' && step.stepOrder > currentStep.stepOrder,
    );
    const flowStatus =
      normalizedDecision === 'rejected' ? 'rejected' : nextStep ? 'pending' : 'approved';
    const currentStepOrder = nextStep?.stepOrder ?? currentStep.stepOrder;

    await this.prisma.approvalFlow.update({
      where: { id: flow.id },
      data: {
        status: flowStatus,
        currentStepOrder,
        completedAt: flowStatus === 'pending' ? undefined : decidedAt,
      },
    });

    const cf = (ticket.customFields as Record<string, unknown>) ?? {};
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        customFields: {
          ...cf,
          approvalRequest: this.buildApprovalSnapshot(
            {
              ...flow,
              status: flowStatus,
              currentStepOrder,
              completedAt: flowStatus === 'pending' ? null : decidedAt,
              steps: updatedSteps,
            },
            {
              lastDecision: normalizedDecision,
              decidedBy: actorUserId,
              decidedAt,
              decisionNotes: notes,
            },
          ),
        },
      },
    });

    await this.addComment(
      orgId,
      ticketId,
      {
        content: `${normalizedDecision === 'approved' ? 'Approved' : 'Rejected'} step ${currentStep.stepName} (${currentStep.stepOrder}/${flow.steps.length})${notes ? `: ${notes}` : ''}`,
        isInternal: true,
      },
      actorUserId,
    );

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: `ticket.approval_${decision}`,
      resource: 'Ticket',
      resourceId: ticketId,
      newValue: {
        flowId: flow.id,
        stepId: currentStep.id,
        decision: normalizedDecision,
        notes,
        flowStatus,
        currentStepOrder,
      },
    });

    return {
      ticketId,
      approvalStatus: flowStatus,
      flowId: flow.id,
      currentStepOrder,
      completed: flowStatus !== 'pending',
    };
  }

  getConsentTemplates() {
    return Object.entries(CONSENT_TEMPLATES).map(([key, tmpl]) => ({ key, ...tmpl }));
  }

  async createConsentTicket(
    orgId: string,
    templateKey: string,
    guardianName: string,
    actorUserId: string,
  ) {
    const tmpl = CONSENT_TEMPLATES[templateKey];
    if (!tmpl) throw new BadRequestException(`Unknown consent template: ${templateKey}`);

    return this.createTicket(
      orgId,
      {
        title: `${tmpl.title} — ${guardianName}`,
        description: tmpl.description,
        category: tmpl.category,
        priority: 'medium',
        requesterId: actorUserId,
        tags: ['consent', templateKey],
      },
      actorUserId,
    );
  }

  // ── T-1042: Category Routing ──

  getCategoryRouting() {
    return CATEGORY_ROUTING;
  }

  // ── Comments ──

  async addComment(
    orgId: string,
    ticketId: string,
    data: {
      content: string;
      isInternal?: boolean;
      attachments?: Prisma.InputJsonValue;
    },
    actorUserId: string,
  ) {
    await this.findById(orgId, ticketId);
    return this.prisma.ticketComment.create({
      data: {
        orgId,
        ticketId,
        authorId: actorUserId,
        content: data.content,
        isInternal: data.isInternal ?? false,
        attachments: data.attachments ?? [],
      },
    });
  }

  async getComments(orgId: string, ticketId: string) {
    await this.findById(orgId, ticketId);
    return this.prisma.ticketComment.findMany({
      where: { orgId, ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── T-1058: SLA Dashboard ──

  async getSlaDashboard(orgId: string) {
    const now = new Date();
    const [open, overdue, resolved, avgResolution] = await Promise.all([
      this.prisma.ticket.count({
        where: { orgId, status: { in: ['open', 'assigned', 'in_progress'] } },
      }),
      this.prisma.ticket.count({
        where: { orgId, status: { in: ['open', 'assigned', 'in_progress'] }, dueDate: { lt: now } },
      }),
      this.prisma.ticket.count({ where: { orgId, status: 'resolved' } }),
      this.prisma.ticket.findMany({
        where: { orgId, status: { in: ['resolved', 'closed'] }, resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
        take: 100,
        orderBy: { resolvedAt: 'desc' },
      }),
    ]);

    let avgHours = 0;
    if (avgResolution.length > 0) {
      const totalMs = avgResolution.reduce(
        (sum, t) => sum + ((t.resolvedAt?.getTime() ?? 0) - t.createdAt.getTime()),
        0,
      );
      avgHours = Math.round((totalMs / avgResolution.length / 3600000) * 10) / 10;
    }

    const total =
      open + resolved + (await this.prisma.ticket.count({ where: { orgId, status: 'closed' } }));
    const slaCompliance = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;

    return {
      openCount: open,
      overdueCount: overdue,
      resolvedCount: resolved,
      avgResolutionHours: avgHours,
      slaCompliancePercent: slaCompliance,
    };
  }

  // ── Helpers ──

  private normalizeApprovalSteps(
    steps: ApprovalStepInput[] | undefined,
    requestedAt: Date,
  ): NormalizedApprovalStep[] {
    const rawSteps = steps?.length ? steps : [{ stepName: 'Default approval' }];
    if (rawSteps.length > MAX_APPROVAL_STEPS) {
      throw new BadRequestException(`Approval flow supports at most ${MAX_APPROVAL_STEPS} steps`);
    }

    return rawSteps.map((step, index) => {
      const dueInHours =
        typeof step.dueInHours === 'number' && Number.isFinite(step.dueInHours)
          ? Math.trunc(step.dueInHours)
          : undefined;
      return {
        stepOrder: index + 1,
        stepName: step.stepName?.trim() || 'Default approval',
        approverRole: step.approverRole?.trim() || undefined,
        approverUserId: step.approverUserId?.trim() || undefined,
        dueAt: dueInHours
          ? new Date(requestedAt.getTime() + dueInHours * 60 * 60 * 1000)
          : undefined,
      };
    });
  }

  private findLatestDueAt(steps: NormalizedApprovalStep[]) {
    const dueTimes = steps
      .map((step) => step.dueAt?.getTime())
      .filter((time): time is number => typeof time === 'number');
    return dueTimes.length ? new Date(Math.max(...dueTimes)) : undefined;
  }

  private normalizeDecision(decision: string) {
    if (decision === 'approve' || decision === 'approved') return 'approved';
    if (decision === 'reject' || decision === 'rejected') return 'rejected';
    throw new BadRequestException("Approval decision must be 'approve' or 'reject'");
  }

  private assertCanDecideStep(
    step: { approverRole: string | null; approverUserId: string | null },
    actorUserId: string,
    actorRole?: string,
  ) {
    if (step.approverUserId && step.approverUserId !== actorUserId) {
      throw new ForbiddenException('Current user is not assigned to this approval step');
    }
    if (
      step.approverRole &&
      actorRole &&
      actorRole !== step.approverRole &&
      actorRole !== 'super_admin'
    ) {
      throw new ForbiddenException(
        `Current role cannot approve step assigned to ${step.approverRole}`,
      );
    }
  }

  private buildApprovalSnapshot(
    flow: {
      id: string;
      approvalType: string;
      amount: unknown;
      status: string;
      currentStepOrder: number;
      requestedBy: string;
      requestedAt: Date;
      completedAt?: Date | null;
      slaDueAt?: Date | null;
      metadata?: Prisma.JsonValue;
      steps: Array<{
        id?: string;
        stepOrder: number;
        stepName: string;
        approverRole?: string | null;
        approverUserId?: string | null;
        status: string;
        dueAt?: Date | null;
        decidedAt?: Date | null;
      }>;
    },
    decision?: {
      lastDecision?: string;
      decidedBy?: string;
      decidedAt?: Date;
      decisionNotes?: string;
    },
  ) {
    const metadata =
      flow.metadata && typeof flow.metadata === 'object' && !Array.isArray(flow.metadata)
        ? (flow.metadata as Record<string, unknown>)
        : {};

    return {
      flowId: flow.id,
      type: flow.approvalType,
      amount: this.toPlainNumber(flow.amount),
      notes: metadata.notes ?? null,
      requestedBy: flow.requestedBy,
      requestedAt: flow.requestedAt.toISOString(),
      status: flow.status,
      currentStepOrder: flow.currentStepOrder,
      totalSteps: flow.steps.length,
      completedAt: flow.completedAt ? flow.completedAt.toISOString() : null,
      slaDueAt: flow.slaDueAt ? flow.slaDueAt.toISOString() : null,
      steps: flow.steps.map((step) => ({
        id: step.id,
        stepOrder: step.stepOrder,
        stepName: step.stepName,
        approverRole: step.approverRole ?? null,
        approverUserId: step.approverUserId ?? null,
        status: step.status,
        dueAt: step.dueAt ? step.dueAt.toISOString() : null,
        decidedAt: step.decidedAt ? step.decidedAt.toISOString() : null,
      })),
      ...decision,
      decidedAt: decision?.decidedAt?.toISOString(),
    };
  }

  private serializeApprovalFlow(flow: {
    amount: unknown;
    metadata: Prisma.JsonValue;
    steps: Array<Record<string, unknown>>;
    decisions?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  }) {
    return {
      ...flow,
      amount: this.toPlainNumber(flow.amount),
    };
  }

  private toPlainNumber(value: unknown) {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  private async generateTicketNumber(orgId: string): Promise<string> {
    const count = await this.prisma.ticket.count({ where: { orgId } });
    return `TK-${String(count + 1).padStart(5, '0')}`;
  }

  private async recordStatusHistory(
    ticketId: string,
    fromStatus: string | null,
    toStatus: string,
    changedBy: string,
    notes?: string,
  ) {
    await this.prisma.ticketStatusHistory.create({
      data: { ticketId, fromStatus, toStatus, changedBy, notes },
    });
  }
}
