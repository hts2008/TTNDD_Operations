import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';

/**
 * SM-10: Approval Request Lifecycle
 * pending → in_progress → approved
 *                       → rejected
 *         → cancelled
 */
const APPROVAL_TRANSITIONS: Record<string, Record<string, string>> = {
  pending: { start: 'in_progress', cancel: 'cancelled' },
  in_progress: { approve: 'approved', reject: 'rejected', cancel: 'cancelled' },
};

interface ApprovalStepDef {
  name: string;
  type: 'sequential' | 'parallel' | 'conditional';
  signerRole?: string;
  signerUserId?: string;
  autoApproveCondition?: { field: string; operator: string; value: unknown };
}

interface StepResult {
  stepIndex: number;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  decidedBy?: string;
  decidedAt?: string;
  notes?: string;
}

interface ThresholdRule {
  minAmount?: number;
  maxAmount?: number;
  requiredRole: string;
  requiredLevel?: number;
}

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── T-0151: Definition CRUD ──

  async createDefinition(orgId: string, data: {
    name: string; description?: string; entityType: string;
    steps: ApprovalStepDef[];
    triggerConditions?: { field: string; operator: string; value: unknown }[];
    thresholds?: ThresholdRule[];
  }, actorUserId: string) {
    if (!data.steps?.length) {
      throw new BadRequestException('Approval definition must have at least one step');
    }

    const definition = await this.prisma.approvalDefinition.create({
      data: {
        orgId,
        name: data.name,
        description: data.description,
        entityType: data.entityType,
        steps: data.steps as unknown as Prisma.InputJsonValue,
        triggerConditions: (data.triggerConditions ?? []) as unknown as Prisma.InputJsonValue,
        thresholds: (data.thresholds ?? []) as unknown as Prisma.InputJsonValue,
        createdBy: actorUserId,
      },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'approval.definition_created',
      resource: 'ApprovalDefinition', resourceId: definition.id,
    });

    return definition;
  }

  async findDefinitions(orgId: string, filters?: { entityType?: string; isActive?: boolean }, page = 1, limit = 20) {
    const where: Prisma.ApprovalDefinitionWhereInput = { orgId };
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const [data, total] = await Promise.all([
      this.prisma.approvalDefinition.findMany({
        where,
        include: { _count: { select: { requests: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.approvalDefinition.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findDefinitionById(orgId: string, definitionId: string) {
    const def = await this.prisma.approvalDefinition.findFirst({
      where: { id: definitionId, orgId },
      include: { requests: { take: 10, orderBy: { requestedAt: 'desc' } } },
    });
    if (!def) throw new NotFoundException('Approval definition not found');
    return def;
  }

  async updateDefinition(orgId: string, definitionId: string, data: Partial<{
    name: string; description: string; isActive: boolean;
    steps: ApprovalStepDef[]; triggerConditions: unknown[];
    thresholds: ThresholdRule[];
  }>) {
    return this.prisma.approvalDefinition.update({
      where: { id: definitionId },
      data: {
        ...data,
        steps: data.steps ? (data.steps as unknown as Prisma.InputJsonValue) : undefined,
        triggerConditions: data.triggerConditions ? (data.triggerConditions as unknown as Prisma.InputJsonValue) : undefined,
        thresholds: data.thresholds ? (data.thresholds as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  // ── T-0151: Request Lifecycle ──

  async submitForApproval(orgId: string, data: {
    definitionId: string; entityType: string; entityId: string;
    metadata?: Record<string, unknown>;
  }, actorUserId: string) {
    const def = await this.findDefinitionById(orgId, data.definitionId);
    if (!def.isActive) {
      throw new BadRequestException('Approval definition is not active');
    }

    const steps = def.steps as unknown as ApprovalStepDef[];
    const initialResults: StepResult[] = steps.map((_, idx) => ({
      stepIndex: idx,
      status: 'pending' as const,
    }));

    const request = await this.prisma.approvalRequest.create({
      data: {
        orgId,
        definitionId: data.definitionId,
        entityType: data.entityType,
        entityId: data.entityId,
        status: 'in_progress',
        currentStep: 0,
        stepResults: initialResults as unknown as Prisma.InputJsonValue,
        requestedBy: actorUserId,
        metadata: (data.metadata ?? {}) as unknown as Prisma.InputJsonValue,
      },
    });

    // T-0154: Check auto-approve for first step
    await this.checkAutoApprove(orgId, request.id, steps, initialResults, data.metadata ?? {}, actorUserId);

    await this.audit.log({
      orgId, userId: actorUserId, action: 'approval.submitted',
      resource: 'ApprovalRequest', resourceId: request.id,
      newValue: { definitionId: data.definitionId, entityType: data.entityType } as unknown as Prisma.InputJsonValue,
    });

    return request;
  }

  // ── T-0152: Rule Evaluator ──

  evaluateCondition(condition: { field: string; operator: string; value: unknown }, context: Record<string, unknown>): boolean {
    const fieldValue = context[condition.field];
    const { operator, value } = condition;

    switch (operator) {
      case 'eq': return fieldValue === value;
      case 'neq': return fieldValue !== value;
      case 'gt': return typeof fieldValue === 'number' && fieldValue > (value as number);
      case 'gte': return typeof fieldValue === 'number' && fieldValue >= (value as number);
      case 'lt': return typeof fieldValue === 'number' && fieldValue < (value as number);
      case 'lte': return typeof fieldValue === 'number' && fieldValue <= (value as number);
      case 'in': return Array.isArray(value) && value.includes(fieldValue);
      case 'contains': return typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.includes(value);
      default: return false;
    }
  }

  evaluateTrigger(conditions: { field: string; operator: string; value: unknown }[], context: Record<string, unknown>): boolean {
    if (!conditions.length) return true;
    return conditions.every((cond) => this.evaluateCondition(cond, context));
  }

  // ── T-0152: Find applicable definition by entity + context ──

  async findApplicableDefinition(orgId: string, entityType: string, context: Record<string, unknown>) {
    const defs = await this.prisma.approvalDefinition.findMany({
      where: { orgId, entityType, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    for (const def of defs) {
      const triggers = def.triggerConditions as unknown as { field: string; operator: string; value: unknown }[];
      if (this.evaluateTrigger(triggers, context)) {
        return def;
      }
    }

    return null;
  }

  // ── T-0153: Step Advance (Sequential/Parallel/Conditional) ──

  async decideStep(orgId: string, requestId: string, decision: {
    status: 'approved' | 'rejected';
    notes?: string;
  }, actorUserId: string) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id: requestId, orgId },
      include: { definition: true },
    });
    if (!request) throw new NotFoundException('Approval request not found');
    if (request.status !== 'in_progress') {
      throw new BadRequestException(`Request is '${request.status}', cannot advance`);
    }

    const steps = request.definition.steps as unknown as ApprovalStepDef[];
    const results = (request.stepResults as unknown as StepResult[]) ?? [];
    const currentIdx = request.currentStep;

    if (currentIdx >= steps.length) {
      throw new BadRequestException('All steps already completed');
    }

    // Record decision
    results[currentIdx] = {
      stepIndex: currentIdx,
      status: decision.status,
      decidedBy: actorUserId,
      decidedAt: new Date().toISOString(),
      notes: decision.notes,
    };

    // If rejected at any step → reject entire request
    if (decision.status === 'rejected') {
      const updated = await this.prisma.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          stepResults: results as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
          finalDecision: 'rejected',
          finalNotes: decision.notes,
        },
      });

      await this.audit.log({
        orgId, userId: actorUserId, action: 'approval.rejected',
        resource: 'ApprovalRequest', resourceId: requestId,
      });

      return updated;
    }

    // Move to next step or complete
    const nextStep = currentIdx + 1;
    const isLastStep = nextStep >= steps.length;

    const updated = await this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        currentStep: isLastStep ? currentIdx : nextStep,
        stepResults: results as unknown as Prisma.InputJsonValue,
        status: isLastStep ? 'approved' : 'in_progress',
        completedAt: isLastStep ? new Date() : undefined,
        finalDecision: isLastStep ? 'approved' : undefined,
      },
    });

    // T-0154: Check auto-approve for next step
    if (!isLastStep) {
      const metadata = request.metadata as Record<string, unknown>;
      await this.checkAutoApprove(orgId, requestId, steps, results, metadata, actorUserId);
    }

    await this.audit.log({
      orgId, userId: actorUserId, action: isLastStep ? 'approval.approved' : 'approval.step_advanced',
      resource: 'ApprovalRequest', resourceId: requestId,
    });

    return updated;
  }

  // ── T-0154: Threshold-Based Auto-Approve ──

  private async checkAutoApprove(
    orgId: string, requestId: string,
    steps: ApprovalStepDef[], results: StepResult[],
    metadata: Record<string, unknown>, actorUserId: string,
  ) {
    const request = await this.prisma.approvalRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== 'in_progress') return;

    const currentIdx = request.currentStep;
    if (currentIdx >= steps.length) return;

    const step = steps[currentIdx];
    if (!step?.autoApproveCondition) return;

    const shouldAutoApprove = this.evaluateCondition(step.autoApproveCondition, metadata);

    if (shouldAutoApprove) {
      results[currentIdx] = {
        stepIndex: currentIdx,
        status: 'approved',
        decidedBy: 'system',
        decidedAt: new Date().toISOString(),
        notes: 'Auto-approved by condition',
      };

      const nextStep = currentIdx + 1;
      const isLastStep = nextStep >= steps.length;

      await this.prisma.approvalRequest.update({
        where: { id: requestId },
        data: {
          currentStep: isLastStep ? currentIdx : nextStep,
          stepResults: results as unknown as Prisma.InputJsonValue,
          status: isLastStep ? 'approved' : 'in_progress',
          completedAt: isLastStep ? new Date() : undefined,
          finalDecision: isLastStep ? 'approved' : undefined,
        },
      });

      // Recursively check next step
      if (!isLastStep) {
        await this.checkAutoApprove(orgId, requestId, steps, results, metadata, actorUserId);
      }
    }
  }

  // ── T-0154: Evaluate Thresholds for Finance ──

  evaluateThresholds(thresholds: ThresholdRule[], amount: number, userRole: string): {
    requiresApproval: boolean; requiredLevel?: number;
  } {
    for (const rule of thresholds) {
      const inRange =
        (rule.minAmount === undefined || amount >= rule.minAmount) &&
        (rule.maxAmount === undefined || amount <= rule.maxAmount);

      if (inRange && rule.requiredRole === userRole) {
        return { requiresApproval: true, requiredLevel: rule.requiredLevel };
      }
    }
    return { requiresApproval: false };
  }

  // ── Request Queries ──

  async findRequests(orgId: string, filters?: {
    status?: string; entityType?: string; definitionId?: string; requestedBy?: string;
  }, page = 1, limit = 20) {
    const where: Prisma.ApprovalRequestWhereInput = { orgId };
    if (filters?.status) where.status = filters.status;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.definitionId) where.definitionId = filters.definitionId;
    if (filters?.requestedBy) where.requestedBy = filters.requestedBy;

    const [data, total] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where,
        include: { definition: { select: { name: true, entityType: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { requestedAt: 'desc' },
      }),
      this.prisma.approvalRequest.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findRequestById(orgId: string, requestId: string) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id: requestId, orgId },
      include: { definition: true },
    });
    if (!request) throw new NotFoundException('Approval request not found');
    return request;
  }

  async cancelRequest(orgId: string, requestId: string, actorUserId: string) {
    const request = await this.findRequestById(orgId, requestId);
    const allowed = APPROVAL_TRANSITIONS[request.status];
    if (!allowed?.['cancel']) {
      throw new BadRequestException(`Cannot cancel request in '${request.status}' status`);
    }

    return this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: 'cancelled', completedAt: new Date() },
    });
  }

  // ── Pending Approvals for User ──

  async findPendingForUser(orgId: string, userId: string, userRole: string) {
    const inProgress = await this.prisma.approvalRequest.findMany({
      where: { orgId, status: 'in_progress' },
      include: { definition: true },
    });

    return inProgress.filter((req) => {
      const steps = req.definition.steps as unknown as ApprovalStepDef[];
      const currentStep = steps[req.currentStep];
      if (!currentStep) return false;

      if (currentStep.signerUserId === userId) return true;
      if (currentStep.signerRole === userRole) return true;
      return false;
    });
  }
}
