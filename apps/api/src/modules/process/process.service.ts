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

  async createDefinition(
    orgId: string,
    data: {
      name: string;
      description?: string;
      steps: WorkflowStep[];
    },
    actorUserId: string,
  ) {
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
      orgId,
      userId: actorUserId,
      action: 'process.definition_created',
      resource: 'WorkflowDefinition',
      resourceId: definition.id,
    });

    return definition;
  }

  async findDefinitions(orgId: string, filters?: { isActive?: boolean }, page = 1, limit = 20) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const where: Prisma.WorkflowDefinitionWhereInput = { orgId };
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const [data, total] = await Promise.all([
      this.prisma.workflowDefinition.findMany({
        where,
        include: { _count: { select: { runs: true } } },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workflowDefinition.count({ where }),
    ]);

    return { data, meta: { total, page: safePage, limit: safeLimit } };
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
      orgId,
      userId: actorUserId,
      action: 'process.run_started',
      resource: 'WorkflowRun',
      resourceId: run.id,
      newValue: { definitionId, definitionName: def.name } as unknown as Prisma.InputJsonValue,
    });

    return run;
  }

  async advanceStep(
    orgId: string,
    runId: string,
    decision: {
      status: 'approved' | 'rejected' | 'completed';
      notes?: string;
    },
    actorUserId: string,
  ) {
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
      orgId,
      userId: actorUserId,
      action: 'process.run_completed',
      resource: 'WorkflowRun',
      resourceId: runId,
    });

    return updated;
  }

  async findRuns(
    orgId: string,
    filters?: { definitionId?: string; status?: string },
    page = 1,
    limit = 20,
  ) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const where: Prisma.WorkflowRunWhereInput = { orgId };
    if (filters?.definitionId) where.definitionId = filters.definitionId;
    if (filters?.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      this.prisma.workflowRun.findMany({
        where,
        include: { definition: { select: { name: true } } },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workflowRun.count({ where }),
    ]);

    return { data, meta: { total, page: safePage, limit: safeLimit } };
  }

  async findRunById(orgId: string, runId: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id: runId, orgId },
      include: { definition: true },
    });
    if (!run) throw new NotFoundException('Workflow run not found');
    return run;
  }
}
