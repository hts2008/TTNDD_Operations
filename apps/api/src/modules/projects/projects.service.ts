import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';

/**
 * SM-2: Plan Approval
 * draft → submitted → approved → locked
 *                   ↘ rejected
 */
const PLAN_TRANSITIONS: Record<string, Record<string, string>> = {
  draft: { submit: 'submitted' },
  submitted: { approve: 'approved', reject: 'rejected' },
  approved: { lock: 'locked' },
  rejected: { resubmit: 'submitted' },
};

/**
 * SM-3: Project Lifecycle
 * planning → active → on_hold → completed
 *                  ↘ cancelled
 */
const PROJECT_TRANSITIONS: Record<string, Record<string, string>> = {
  planning: { activate: 'active', cancel: 'cancelled' },
  active: { hold: 'on_hold', complete: 'completed', cancel: 'cancelled' },
  on_hold: { resume: 'active', cancel: 'cancelled' },
};

/**
 * SM-4: Task Lifecycle
 * todo → in_progress → review → done
 *                            ↘ cancelled
 */
const TASK_TRANSITIONS: Record<string, Record<string, string>> = {
  todo: { start: 'in_progress', cancel: 'cancelled' },
  in_progress: { review: 'review', cancel: 'cancelled' },
  review: { approve: 'done', reject: 'in_progress', cancel: 'cancelled' },
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── Plan CRUD ──

  async createPlan(orgId: string, data: {
    title: string; planType?: string;
    sectionIDescription?: string; sectionIIObjectives?: Prisma.InputJsonValue;
    sectionIIIOutcomes?: Prisma.InputJsonValue; sectionIVActivities?: Prisma.InputJsonValue;
    sectionVPersonnel?: Prisma.InputJsonValue; sectionVIContent?: Prisma.InputJsonValue;
    sectionVIITimeline?: Prisma.InputJsonValue; sectionVIIIProposal?: string;
    sectionIXBudget?: Prisma.InputJsonValue;
  }, actorUserId: string) {
    const plan = await this.prisma.plan.create({
      data: { orgId, ...data },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'project.plan_created',
      resource: 'Plan', resourceId: plan.id,
    });

    return plan;
  }

  async findPlans(orgId: string, filters?: { status?: string; planType?: string }, page = 1, limit = 20) {
    const where: Prisma.PlanWhereInput = { orgId };
    if (filters?.status) where.status = filters.status;
    if (filters?.planType) where.planType = filters.planType;

    const [data, total] = await Promise.all([
      this.prisma.plan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.plan.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findPlanById(orgId: string, planId: string) {
    const plan = await this.prisma.plan.findFirst({ where: { id: planId, orgId } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  // ── Plan Revision History (T-0134) ──

  private async createRevisionSnapshot(plan: {
    id: string; orgId: string; title: string; planType: string | null;
    sectionIDescription: string | null; sectionIIObjectives: unknown;
    sectionIIIOutcomes: unknown; sectionIVActivities: unknown;
    sectionVPersonnel: unknown; sectionVIContent: unknown;
    sectionVIITimeline: unknown; sectionVIIIProposal: string | null;
    sectionIXBudget: unknown; status: string;
  }, changedBy: string, fromStatus?: string, toStatus?: string, changeReason?: string) {
    const lastRevision = await this.prisma.planRevision.findFirst({
      where: { planId: plan.id },
      orderBy: { revisionNumber: 'desc' },
      select: { revisionNumber: true },
    });
    const nextNumber = (lastRevision?.revisionNumber ?? 0) + 1;

    return this.prisma.planRevision.create({
      data: {
        planId: plan.id,
        orgId: plan.orgId,
        revisionNumber: nextNumber,
        snapshotData: {
          title: plan.title,
          planType: plan.planType,
          sectionIDescription: plan.sectionIDescription,
          sectionIIObjectives: plan.sectionIIObjectives ?? null,
          sectionIIIOutcomes: plan.sectionIIIOutcomes ?? null,
          sectionIVActivities: plan.sectionIVActivities ?? null,
          sectionVPersonnel: plan.sectionVPersonnel ?? null,
          sectionVIContent: plan.sectionVIContent ?? null,
          sectionVIITimeline: plan.sectionVIITimeline ?? null,
          sectionVIIIProposal: plan.sectionVIIIProposal,
          sectionIXBudget: plan.sectionIXBudget ?? null,
          status: plan.status,
        } as Prisma.InputJsonValue,
        changedBy,
        fromStatus: fromStatus ?? null,
        toStatus: toStatus ?? null,
        changeReason: changeReason ?? null,
      },
    });
  }

  async getPlanRevisions(orgId: string, planId: string, page = 1, limit = 20) {
    await this.findPlanById(orgId, planId);
    const [data, total] = await Promise.all([
      this.prisma.planRevision.findMany({
        where: { planId, orgId },
        orderBy: { revisionNumber: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.planRevision.count({ where: { planId, orgId } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async createManualRevision(orgId: string, planId: string, actorUserId: string, changeReason?: string) {
    const plan = await this.findPlanById(orgId, planId);
    const revision = await this.createRevisionSnapshot(plan, actorUserId, undefined, undefined, changeReason ?? 'Manual snapshot');
    await this.audit.log({
      orgId, userId: actorUserId, action: 'project.plan_revision_created',
      resource: 'PlanRevision', resourceId: revision.id,
    });
    return revision;
  }

  async transitionPlan(orgId: string, planId: string, action: string, actorUserId: string, rejectionReason?: string) {
    const plan = await this.findPlanById(orgId, planId);
    const allowed = PLAN_TRANSITIONS[plan.status];
    if (!allowed?.[action]) {
      throw new BadRequestException(`Action '${action}' not allowed from '${plan.status}'`);
    }
    const newStatus = allowed[action];

    const updateData: Prisma.PlanUpdateInput = { status: newStatus };
    if (action === 'submit') {
      updateData.submittedBy = actorUserId;
      updateData.submittedAt = new Date();
    }
    if (action === 'approve') {
      updateData.approvedBy = actorUserId;
      updateData.approvedAt = new Date();
    }
    if (action === 'reject' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    // T-0134: Auto-snapshot before transition
    await this.createRevisionSnapshot(plan, actorUserId, plan.status, newStatus, `State transition: ${action}`);

    const updated = await this.prisma.plan.update({ where: { id: planId }, data: updateData });

    if (newStatus === 'submitted') {
      await this.domainEvents.publish({
        orgId, eventType: DOMAIN_EVENTS.PROJECT.PLAN_SUBMITTED,
        aggregateId: planId, aggregateType: 'Plan', payload: { title: plan.title }, actorUserId,
      });
    }
    if (newStatus === 'approved') {
      await this.domainEvents.publish({
        orgId, eventType: DOMAIN_EVENTS.PROJECT.PLAN_APPROVED,
        aggregateId: planId, aggregateType: 'Plan', payload: { title: plan.title }, actorUserId,
      });
    }

    return updated;
  }

  // ── Project CRUD ──

  async createProject(orgId: string, data: {
    title: string; description?: string; projectType?: string;
    sourcePlanId?: string; objectives?: Prisma.InputJsonValue;
    keyResults?: Prisma.InputJsonValue; ownerId?: string;
    startDate?: string; endDate?: string; settings?: Prisma.InputJsonValue;
  }, actorUserId: string) {
    const project = await this.prisma.project.create({
      data: {
        orgId,
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        createdBy: actorUserId,
      },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'project.project_created',
      resource: 'Project', resourceId: project.id,
    });

    return project;
  }

  async findProjects(orgId: string, filters?: { status?: string; projectType?: string; ownerId?: string }, page = 1, limit = 20) {
    const where: Prisma.ProjectWhereInput = { orgId };
    if (filters?.status) where.status = filters.status;
    if (filters?.projectType) where.projectType = filters.projectType;
    if (filters?.ownerId) where.ownerId = filters.ownerId;

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: { _count: { select: { projectTasks: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findProjectById(orgId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId },
      include: { projectTasks: { orderBy: { position: 'asc' } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async transitionProject(orgId: string, projectId: string, action: string, actorUserId: string) {
    const project = await this.findProjectById(orgId, projectId);
    const allowed = PROJECT_TRANSITIONS[project.status];
    if (!allowed?.[action]) {
      throw new BadRequestException(`Action '${action}' not allowed from '${project.status}'`);
    }
    const newStatus = allowed[action];

    const updated = await this.prisma.project.update({ where: { id: projectId }, data: { status: newStatus } });

    if (newStatus === 'completed') {
      await this.domainEvents.publish({
        orgId, eventType: DOMAIN_EVENTS.PROJECT.PROJECT_COMPLETED,
        aggregateId: projectId, aggregateType: 'Project',
        payload: { title: project.title }, actorUserId,
      });
    }

    return updated;
  }

  // ── Task CRUD ──

  async createTask(orgId: string, projectId: string, data: {
    title: string; description?: string; taskType?: string;
    assigneeIds?: string[]; reporterId?: string;
    startDate?: string; dueDate?: string; storyPoints?: number;
    priority?: string; tags?: string[]; parentTaskId?: string;
    position?: number;
  }, actorUserId: string) {
    await this.findProjectById(orgId, projectId);

    const task = await this.prisma.projectTask.create({
      data: {
        orgId,
        projectId,
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        createdBy: actorUserId,
      },
    });

    return task;
  }

  async findTasks(orgId: string, projectId: string, filters?: { status?: string; priority?: string; assigneeId?: string }, page = 1, limit = 50) {
    const where: Prisma.ProjectTaskWhereInput = { orgId, projectId };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.assigneeId) where.assigneeIds = { has: filters.assigneeId };

    const [data, total] = await Promise.all([
      this.prisma.projectTask.findMany({
        where,
        include: { subTasks: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { position: 'asc' },
      }),
      this.prisma.projectTask.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findTaskById(orgId: string, taskId: string) {
    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, orgId },
      include: { project: { select: { title: true, status: true } }, subTasks: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async updateTask(orgId: string, taskId: string, data: Partial<{
    title: string; description: string; assigneeIds: string[];
    startDate: string; dueDate: string; storyPoints: number;
    priority: string; tags: string[]; position: number;
  }>, actorUserId: string) {
    const updateData: Prisma.ProjectTaskUpdateInput = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);

    const task = await this.prisma.projectTask.update({ where: { id: taskId, orgId }, data: updateData });
    await this.audit.log({
      orgId, userId: actorUserId, action: 'project.task_updated',
      resource: 'ProjectTask', resourceId: taskId, newValue: data as Prisma.InputJsonValue,
    });
    return task;
  }

  async transitionTask(orgId: string, taskId: string, action: string, actorUserId: string) {
    const task = await this.findTaskById(orgId, taskId);
    const allowed = TASK_TRANSITIONS[task.status];
    if (!allowed?.[action]) {
      throw new BadRequestException(`Action '${action}' not allowed from '${task.status}'`);
    }
    const newStatus = allowed[action];

    const updated = await this.prisma.projectTask.update({ where: { id: taskId }, data: { status: newStatus } });

    if (newStatus === 'done') {
      await this.domainEvents.publish({
        orgId, eventType: DOMAIN_EVENTS.PROJECT.TASK_COMPLETED,
        aggregateId: taskId, aggregateType: 'ProjectTask',
        payload: { title: task.title, projectId: task.projectId }, actorUserId,
      });
    }

    return updated;
  }

  // ── Kanban ──

  async getKanban(orgId: string, projectId: string) {
    await this.findProjectById(orgId, projectId);

    const tasks = await this.prisma.projectTask.findMany({
      where: { orgId, projectId },
      orderBy: { position: 'asc' },
    });

    const columns: Record<string, typeof tasks> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
      cancelled: [],
    };

    for (const task of tasks) {
      const col = columns[task.status as keyof typeof columns];
      if (col) col.push(task);
    }

    return { projectId, columns };
  }

  // ── Auto-Generator ──

  async generateProjectFromPlan(orgId: string, planId: string, actorUserId: string) {
    const plan = await this.findPlanById(orgId, planId);
    if (plan.status !== 'approved') {
      throw new BadRequestException('Plan must be approved before generating a project');
    }
    if (plan.generatedProjectId) {
      throw new BadRequestException('Project already generated from this plan');
    }

    const activities = (plan.sectionIVActivities as Array<{ name: string; description?: string }>) ?? [];
    const objectives = plan.sectionIIObjectives ?? [];

    const project = await this.prisma.project.create({
      data: {
        orgId,
        title: plan.title,
        description: plan.sectionIDescription ?? undefined,
        sourcePlanId: planId,
        objectives: objectives as Prisma.InputJsonValue,
        createdBy: actorUserId,
      },
    });

    const taskOps = activities.map((activity, idx) =>
      this.prisma.projectTask.create({
        data: {
          orgId,
          projectId: project.id,
          title: activity.name ?? `Task ${idx + 1}`,
          description: activity.description ?? undefined,
          position: idx,
          createdBy: actorUserId,
        },
      }),
    );

    await Promise.all(taskOps);

    await this.prisma.plan.update({
      where: { id: planId },
      data: { generatedProjectId: project.id },
    });

    return this.findProjectById(orgId, project.id);
  }

  // ── Tree View (T-0138) ──

  async getProjectTree(orgId: string, projectId: string) {
    await this.findProjectById(orgId, projectId);

    const [phases, tasks] = await Promise.all([
      this.prisma.projectPhase.findMany({
        where: { orgId, projectId },
        orderBy: { position: 'asc' },
      }),
      this.prisma.projectTask.findMany({
        where: { orgId, projectId },
        orderBy: { position: 'asc' },
      }),
    ]);

    // Build phase tree
    const phaseMap = new Map(phases.map(p => [p.id, { ...p, subPhases: [] as typeof phases, tasks: [] as typeof tasks }]));
    const rootPhases: Array<(typeof phaseMap extends Map<string, infer V> ? V : never)> = [];

    for (const phase of phaseMap.values()) {
      if (phase.parentId && phaseMap.has(phase.parentId)) {
        phaseMap.get(phase.parentId)!.subPhases.push(phase as any);
      } else {
        rootPhases.push(phase);
      }
    }

    // Attach tasks to phases
    const unassignedTasks: typeof tasks = [];
    for (const task of tasks) {
      if (task.phaseId && phaseMap.has(task.phaseId)) {
        phaseMap.get(task.phaseId)!.tasks.push(task);
      } else {
        unassignedTasks.push(task);
      }
    }

    return { projectId, phases: rootPhases, unassignedTasks };
  }

  // ── Phase CRUD (T-0136 API) ──

  async createPhase(orgId: string, projectId: string, data: {
    title: string; phaseType?: string; parentId?: string;
    startDate?: string; endDate?: string; position?: number;
  }) {
    await this.findProjectById(orgId, projectId);
    return this.prisma.projectPhase.create({
      data: {
        orgId,
        projectId,
        title: data.title,
        phaseType: data.phaseType ?? 'phase',
        parentId: data.parentId ?? undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        position: data.position ?? 0,
      },
    });
  }

  async findPhases(orgId: string, projectId: string) {
    await this.findProjectById(orgId, projectId);
    return this.prisma.projectPhase.findMany({
      where: { orgId, projectId },
      orderBy: { position: 'asc' },
      include: { tasks: { orderBy: { position: 'asc' } } },
    });
  }

  // ── Comments (T-0140) ──

  async addComment(orgId: string, projectId: string, authorId: string, content: string, taskId?: string) {
    await this.findProjectById(orgId, projectId);
    if (taskId) await this.findTaskById(orgId, taskId);
    return this.prisma.projectComment.create({
      data: { orgId, projectId, taskId: taskId ?? undefined, authorId, content },
    });
  }

  async findComments(orgId: string, projectId: string, taskId?: string, page = 1, limit = 20) {
    const where = { orgId, projectId, ...(taskId ? { taskId } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.projectComment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.projectComment.count({ where }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  // ── Task Dependencies (T-0141) ──

  async addDependency(
    orgId: string,
    projectId: string,
    data: { sourceTaskId: string; targetTaskId: string; dependencyType?: string; lagDays?: number },
  ) {
    await this.findProjectById(orgId, projectId);
    if (data.sourceTaskId === data.targetTaskId) {
      throw new BadRequestException('A task cannot depend on itself');
    }
    // Simple cycle check: ensure target doesn't already depend on source
    const reverse = await this.prisma.taskDependency.findFirst({
      where: { orgId, sourceTaskId: data.targetTaskId, targetTaskId: data.sourceTaskId },
    });
    if (reverse) {
      throw new BadRequestException('Circular dependency detected');
    }

    return this.prisma.taskDependency.create({
      data: {
        orgId,
        projectId,
        sourceTaskId: data.sourceTaskId,
        targetTaskId: data.targetTaskId,
        dependencyType: data.dependencyType ?? 'finish_to_start',
        lagDays: data.lagDays ?? 0,
      },
    });
  }

  async findDependencies(orgId: string, projectId: string) {
    return this.prisma.taskDependency.findMany({
      where: { orgId, projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async removeDependency(orgId: string, depId: string) {
    return this.prisma.taskDependency.delete({ where: { id: depId } });
  }

  // ── Gantt / Timeline (T-0142) ──

  async getGanttData(orgId: string, projectId: string) {
    await this.findProjectById(orgId, projectId);

    const [phases, tasks, dependencies] = await Promise.all([
      this.prisma.projectPhase.findMany({
        where: { orgId, projectId },
        orderBy: { position: 'asc' },
      }),
      this.prisma.projectTask.findMany({
        where: { orgId, projectId },
        orderBy: { position: 'asc' },
        select: {
          id: true, title: true, status: true, startDate: true, dueDate: true,
          phaseId: true, parentTaskId: true, assigneeIds: true, storyPoints: true, position: true,
        },
      }),
      this.prisma.taskDependency.findMany({
        where: { orgId, projectId },
      }),
    ]);

    return {
      projectId,
      phases: phases.map(p => ({
        id: p.id, title: p.title, type: p.phaseType,
        start: p.startDate, end: p.endDate, status: p.status,
      })),
      tasks: tasks.map(t => ({
        id: t.id, title: t.title, status: t.status,
        start: t.startDate, end: t.dueDate,
        phaseId: t.phaseId, parentTaskId: t.parentTaskId,
        assignees: t.assigneeIds, points: t.storyPoints,
      })),
      dependencies: dependencies.map(d => ({
        id: d.id, source: d.sourceTaskId, target: d.targetTaskId,
        type: d.dependencyType, lag: d.lagDays,
      })),
    };
  }

  // ── Documents / Wiki (T-0143) ──

  async createDocument(orgId: string, projectId: string, authorId: string, data: {
    title: string; content?: string; docType?: string; parentId?: string;
  }) {
    await this.findProjectById(orgId, projectId);
    return this.prisma.projectDocument.create({
      data: {
        orgId,
        projectId,
        title: data.title,
        content: data.content ?? '',
        docType: data.docType ?? 'wiki',
        parentId: data.parentId ?? undefined,
        authorId,
      },
    });
  }

  async findDocuments(orgId: string, projectId: string) {
    return this.prisma.projectDocument.findMany({
      where: { orgId, projectId },
      orderBy: { position: 'asc' },
    });
  }

  async updateDocument(orgId: string, docId: string, data: { title?: string; content?: string }) {
    return this.prisma.projectDocument.update({
      where: { id: docId },
      data,
    });
  }

  // ── Time Tracking (T-0144) ──

  async logTime(orgId: string, projectId: string, userId: string, data: {
    hours: number; description?: string; logDate: string; taskId?: string;
  }) {
    await this.findProjectById(orgId, projectId);
    return this.prisma.timeEntry.create({
      data: {
        orgId,
        projectId,
        taskId: data.taskId ?? undefined,
        userId,
        hours: data.hours,
        description: data.description ?? undefined,
        logDate: new Date(data.logDate),
      },
    });
  }

  async findTimeEntries(orgId: string, projectId: string, taskId?: string) {
    return this.prisma.timeEntry.findMany({
      where: { orgId, projectId, ...(taskId ? { taskId } : {}) },
      orderBy: { logDate: 'desc' },
    });
  }

  // ── Cost Tracking (T-0144) ──

  async logCost(orgId: string, projectId: string, createdBy: string, data: {
    category: string; amount: number; currency?: string;
    description?: string; logDate: string; taskId?: string;
  }) {
    await this.findProjectById(orgId, projectId);
    return this.prisma.costEntry.create({
      data: {
        orgId,
        projectId,
        taskId: data.taskId ?? undefined,
        category: data.category,
        amount: data.amount,
        currency: data.currency ?? 'VND',
        description: data.description ?? undefined,
        logDate: new Date(data.logDate),
        createdBy,
      },
    });
  }

  async findCostEntries(orgId: string, projectId: string, taskId?: string) {
    return this.prisma.costEntry.findMany({
      where: { orgId, projectId, ...(taskId ? { taskId } : {}) },
      orderBy: { logDate: 'desc' },
    });
  }
}
