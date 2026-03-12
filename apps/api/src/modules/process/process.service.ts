import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';

/**
 * SM-9: Workflow Run Lifecycle
 * pending → in_progress → completed
 *                       → cancelled
 */
const RUN_TRANSITIONS: Record<string, Record<string, string>> = {
  pending: { start: 'in_progress', cancel: 'cancelled' },
  in_progress: { complete: 'completed', cancel: 'cancelled' },
};

interface WorkflowStep {
  name: string;
  type: 'approval' | 'task' | 'notification';
  assigneeRole?: string;
  description?: string;
}

interface StepResult {
  stepIndex: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'skipped';
  completedBy?: string;
  completedAt?: string;
  notes?: string;
}

@Injectable()
export class ProcessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── Workflow Definitions ──

  async createDefinition(orgId: string, data: {
    name: string; description?: string; steps: WorkflowStep[];
  }, actorUserId: string) {
    if (!data.steps?.length) {
      throw new BadRequestException('Workflow must have at least one step');
    }

    const definition = await this.prisma.workflowDefinition.create({
      data: {
        orgId,
        name: data.name,
        description: data.description,
        steps: data.steps as unknown as Prisma.InputJsonValue,
        createdBy: actorUserId,
      },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'process.definition_created',
      resource: 'WorkflowDefinition', resourceId: definition.id,
    });

    return definition;
  }

  async findDefinitions(orgId: string, filters?: { isActive?: boolean }, page = 1, limit = 20) {
    const where: Prisma.WorkflowDefinitionWhereInput = { orgId };
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const [data, total] = await Promise.all([
      this.prisma.workflowDefinition.findMany({
        where,
        include: { _count: { select: { runs: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workflowDefinition.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findDefinitionById(orgId: string, definitionId: string) {
    const def = await this.prisma.workflowDefinition.findFirst({
      where: { id: definitionId, orgId },
      include: { runs: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!def) throw new NotFoundException('Workflow definition not found');
    return def;
  }

  // ── Workflow Runs ──

  async startRun(orgId: string, definitionId: string, actorUserId: string) {
    const def = await this.findDefinitionById(orgId, definitionId);
    if (!def.isActive) {
      throw new BadRequestException('Cannot start a run for an inactive workflow');
    }

    const steps = def.steps as unknown as WorkflowStep[];
    const initialResults: StepResult[] = steps.map((_, idx) => ({
      stepIndex: idx,
      status: idx === 0 ? 'pending' : 'pending',
    }));

    const run = await this.prisma.workflowRun.create({
      data: {
        orgId,
        definitionId,
        status: 'in_progress',
        currentStep: 0,
        stepResults: initialResults as unknown as Prisma.InputJsonValue,
        initiatedBy: actorUserId,
      },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'process.run_started',
      resource: 'WorkflowRun', resourceId: run.id,
      newValue: { definitionId, definitionName: def.name } as unknown as Prisma.InputJsonValue,
    });

    return run;
  }

  async advanceStep(orgId: string, runId: string, decision: {
    status: 'approved' | 'rejected' | 'completed';
    notes?: string;
  }, actorUserId: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id: runId, orgId },
      include: { definition: true },
    });
    if (!run) throw new NotFoundException('Workflow run not found');
    if (run.status !== 'in_progress') {
      throw new BadRequestException(`Run is '${run.status}', cannot advance`);
    }

    const steps = run.definition.steps as unknown as WorkflowStep[];
    const results = (run.stepResults as unknown as StepResult[]) ?? [];
    const currentIdx = run.currentStep;

    if (currentIdx >= steps.length) {
      throw new BadRequestException('All steps already completed');
    }

    const currentStep = steps[currentIdx];
    results[currentIdx] = {
      stepIndex: currentIdx,
      status: decision.status,
      completedBy: actorUserId,
      completedAt: new Date().toISOString(),
      notes: decision.notes,
    };

    if (currentStep?.type === 'approval' && decision.status === 'rejected') {
      const updated = await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'cancelled',
          stepResults: results as unknown as Prisma.InputJsonValue,
        },
      });
      return updated;
    }

    const nextStep = currentIdx + 1;
    const isLastStep = nextStep >= steps.length;

    const updated = await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        currentStep: isLastStep ? currentIdx : nextStep,
        stepResults: results as unknown as Prisma.InputJsonValue,
        status: isLastStep ? 'completed' : 'in_progress',
        completedAt: isLastStep ? new Date() : undefined,
      },
    });

    return updated;
  }

  async completeRun(orgId: string, runId: string, actorUserId: string) {
    const run = await this.prisma.workflowRun.findFirst({ where: { id: runId, orgId } });
    if (!run) throw new NotFoundException('Workflow run not found');

    const allowed = RUN_TRANSITIONS[run.status];
    if (!allowed?.['complete']) {
      throw new BadRequestException(`Cannot complete run in '${run.status}' status`);
    }

    const updated = await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'completed', completedAt: new Date() },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'process.run_completed',
      resource: 'WorkflowRun', resourceId: runId,
    });

    return updated;
  }

  async findRuns(orgId: string, filters?: { definitionId?: string; status?: string }, page = 1, limit = 20) {
    const where: Prisma.WorkflowRunWhereInput = { orgId };
    if (filters?.definitionId) where.definitionId = filters.definitionId;
    if (filters?.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      this.prisma.workflowRun.findMany({
        where,
        include: { definition: { select: { name: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workflowRun.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findRunById(orgId: string, runId: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id: runId, orgId },
      include: { definition: true },
    });
    if (!run) throw new NotFoundException('Workflow run not found');
    return run;
  }

  // ── T-0158: Trigger-Condition-Action Executor ──

  async createTrigger(orgId: string, data: {
    name: string; eventType: string;
    conditions: { field: string; operator: string; value: unknown }[];
    actions: { type: string; config: Record<string, unknown> }[];
    definitionId?: string;
  }, actorUserId: string) {
    return this.prisma.workflowTrigger.create({
      data: {
        orgId,
        name: data.name,
        eventType: data.eventType,
        conditions: data.conditions as unknown as Prisma.InputJsonValue,
        actions: data.actions as unknown as Prisma.InputJsonValue,
        definitionId: data.definitionId,
        createdBy: actorUserId,
      },
    });
  }

  async findTriggers(orgId: string, filters?: { eventType?: string; isActive?: boolean }) {
    const where: Prisma.WorkflowTriggerWhereInput = { orgId };
    if (filters?.eventType) where.eventType = filters.eventType;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return this.prisma.workflowTrigger.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  /**
   * T-0158: Evaluate all active triggers for a given event,
   * fire actions for those whose conditions match context.
   */
  async evaluateAndFireTriggers(orgId: string, eventType: string, context: Record<string, unknown>, actorUserId: string) {
    const triggers = await this.prisma.workflowTrigger.findMany({
      where: { orgId, eventType, isActive: true },
    });

    const fired: { triggerId: string; actionsExecuted: string[] }[] = [];

    for (const trigger of triggers) {
      const conditions = trigger.conditions as unknown as { field: string; operator: string; value: unknown }[];
      const allMatch = conditions.every((cond) => {
        const fieldValue = context[cond.field];
        switch (cond.operator) {
          case 'eq': return fieldValue === cond.value;
          case 'neq': return fieldValue !== cond.value;
          case 'gt': return typeof fieldValue === 'number' && fieldValue > (cond.value as number);
          case 'gte': return typeof fieldValue === 'number' && fieldValue >= (cond.value as number);
          case 'lt': return typeof fieldValue === 'number' && fieldValue < (cond.value as number);
          case 'lte': return typeof fieldValue === 'number' && fieldValue <= (cond.value as number);
          case 'in': return Array.isArray(cond.value) && (cond.value as unknown[]).includes(fieldValue);
          case 'contains': return typeof fieldValue === 'string' && typeof cond.value === 'string' && fieldValue.includes(cond.value);
          default: return false;
        }
      });

      if (!allMatch) continue;

      const actions = trigger.actions as unknown as { type: string; config: Record<string, unknown> }[];
      const executed: string[] = [];

      for (const action of actions) {
        switch (action.type) {
          case 'start_workflow':
            if (trigger.definitionId) {
              await this.startRun(orgId, trigger.definitionId, actorUserId);
            }
            executed.push('start_workflow');
            break;
          case 'notify':
            // Integration point for notifications module
            executed.push('notify');
            break;
          case 'update_field':
            // Integration point for entity updates
            executed.push('update_field');
            break;
        }
      }

      fired.push({ triggerId: trigger.id, actionsExecuted: executed });
    }

    return { eventType, triggersEvaluated: triggers.length, fired };
  }

  // ── T-0159: SOP Documents CRUD ──

  async createSopDocument(orgId: string, data: {
    title: string; content: string;
    category?: string; tags?: string[];
    relatedWorkflowId?: string;
  }, actorUserId: string) {
    const doc = await this.prisma.sopDocument.create({
      data: {
        orgId,
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags ?? [],
        relatedWorkflowId: data.relatedWorkflowId,
        createdBy: actorUserId,
      },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'sop.created',
      resource: 'SopDocument', resourceId: doc.id,
    });

    return doc;
  }

  async findSopDocuments(orgId: string, filters?: {
    category?: string; status?: string; search?: string;
  }, page = 1, limit = 20) {
    const where: Prisma.SopDocumentWhereInput = { orgId };
    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
        { tags: { hasSome: [filters.search] } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.sopDocument.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.sopDocument.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findSopDocumentById(orgId: string, docId: string) {
    const doc = await this.prisma.sopDocument.findFirst({
      where: { id: docId, orgId },
    });
    if (!doc) throw new NotFoundException('SOP document not found');
    return doc;
  }

  async updateSopDocument(orgId: string, docId: string, data: Partial<{
    title: string; content: string; category: string; tags: string[];
  }>, actorUserId: string) {
    const existing = await this.findSopDocumentById(orgId, docId);

    return this.prisma.sopDocument.update({
      where: { id: docId },
      data: {
        ...data,
        version: existing.version + 1,
      },
    });
  }

  async publishSopDocument(orgId: string, docId: string, actorUserId: string) {
    const doc = await this.findSopDocumentById(orgId, docId);
    if (doc.status === 'published') {
      throw new BadRequestException('Document is already published');
    }

    return this.prisma.sopDocument.update({
      where: { id: docId },
      data: { status: 'published', publishedAt: new Date() },
    });
  }

  async archiveSopDocument(orgId: string, docId: string) {
    return this.prisma.sopDocument.update({
      where: { id: docId },
      data: { status: 'archived', archivedAt: new Date() },
    });
  }

  // ── T-0160: Publish/Retire Workflow Definitions ──

  async publishDefinition(orgId: string, definitionId: string, actorUserId: string) {
    const def = await this.findDefinitionById(orgId, definitionId);
    if (!def.isActive) {
      throw new BadRequestException('Cannot publish an inactive definition');
    }

    const updated = await this.prisma.workflowDefinition.update({
      where: { id: definitionId },
      data: { isPublished: true, publishedAt: new Date() },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'process.definition_published',
      resource: 'WorkflowDefinition', resourceId: definitionId,
    });

    return updated;
  }

  async retireDefinition(orgId: string, definitionId: string, actorUserId: string) {
    const updated = await this.prisma.workflowDefinition.update({
      where: { id: definitionId },
      data: { isActive: false, retiredAt: new Date() },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'process.definition_retired',
      resource: 'WorkflowDefinition', resourceId: definitionId,
    });

    return updated;
  }

  async updateDefinition(orgId: string, definitionId: string, data: Partial<{
    name: string; description: string; steps: unknown[];
    triggers: unknown[]; isActive: boolean;
  }>, actorUserId: string) {
    const existing = await this.findDefinitionById(orgId, definitionId);

    const updated = await this.prisma.workflowDefinition.update({
      where: { id: definitionId },
      data: {
        ...data,
        steps: data.steps ? (data.steps as unknown as Prisma.InputJsonValue) : undefined,
        triggers: data.triggers ? (data.triggers as unknown as Prisma.InputJsonValue) : undefined,
        version: existing.version + 1,
      },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'process.definition_updated',
      resource: 'WorkflowDefinition', resourceId: definitionId,
    });

    return updated;
  }
}
