import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';

// ── Plan Templates (T-1022) ──
const PLAN_TEMPLATES: Record<
  string,
  Partial<{
    planType: string;
    sectionIDescription: string;
    sectionIIObjectives: unknown;
    sectionIVActivities: unknown;
    sectionVPersonnel: unknown;
    sectionVIITimeline: unknown;
    sectionIXBudget: unknown;
  }>
> = {
  camp: {
    planType: 'camp',
    sectionIDescription:
      'Kế hoạch tổ chức trại — điền chi tiết địa điểm, thời gian, đối tượng tham gia.',
    sectionIIObjectives: [
      { objective: 'Rèn luyện kỹ năng sinh tồn' },
      { objective: 'Xây dựng tinh thần đồng đội' },
    ],
    sectionIVActivities: [
      { name: 'Dựng trại', description: 'Setup khu vực trại' },
      { name: 'Lửa trại', description: 'Chương trình văn nghệ' },
      { name: 'Trò chơi lớn', description: 'Hoạt động ngoài trời' },
    ],
    sectionVPersonnel: {
      roles: [
        { role: 'Trại trưởng', raci: 'R' },
        { role: 'Phó trại', raci: 'A' },
        { role: 'Hậu cần', raci: 'C' },
      ],
    },
    sectionIXBudget: {
      categories: [
        { name: 'Ăn uống', amount: 0 },
        { name: 'Vận chuyển', amount: 0 },
        { name: 'Vật tư', amount: 0 },
      ],
    },
  },
  event: {
    planType: 'event',
    sectionIDescription: 'Kế hoạch tổ chức sự kiện — điền chi tiết nội dung, địa điểm, khách mời.',
    sectionIIObjectives: [{ objective: 'Tổ chức sự kiện thành công' }],
    sectionIVActivities: [{ name: 'Khai mạc' }, { name: 'Chương trình chính' }, { name: 'Bế mạc' }],
    sectionVPersonnel: {
      roles: [
        { role: 'MC', raci: 'R' },
        { role: 'Ban tổ chức', raci: 'A' },
      ],
    },
    sectionIXBudget: {
      categories: [
        { name: 'Trang trí', amount: 0 },
        { name: 'Âm thanh', amount: 0 },
      ],
    },
  },
  year_plan: {
    planType: 'year_plan',
    sectionIDescription: 'Kế hoạch hoạt động năm — tổng quan các hoạt động trong năm.',
    sectionIIObjectives: [
      { objective: 'Phát triển đoàn sinh' },
      { objective: 'Hoàn thành chương trình huấn luyện' },
    ],
    sectionIVActivities: [
      { name: 'Q1: Hoạt động mùa xuân' },
      { name: 'Q2: Trại hè' },
      { name: 'Q3: Hoạt động thu' },
      { name: 'Q4: Tổng kết' },
    ],
    sectionVPersonnel: {
      roles: [
        { role: 'Đoàn trưởng', raci: 'R' },
        { role: 'Đoàn phó', raci: 'A' },
      ],
    },
    sectionVIITimeline: { quarters: ['Q1', 'Q2', 'Q3', 'Q4'] },
    sectionIXBudget: {
      categories: [
        { name: 'Sinh hoạt phí', amount: 0 },
        { name: 'Trại', amount: 0 },
        { name: 'Dụng cụ', amount: 0 },
      ],
    },
  },
};

/** SM-2: Plan Approval — draft → submitted → approved → locked; submitted → rejected → resubmitted */
const PLAN_TRANSITIONS: Record<string, Record<string, string>> = {
  draft: { submit: 'submitted' },
  submitted: { approve: 'approved', reject: 'rejected' },
  approved: { lock: 'locked' },
  rejected: { resubmit: 'submitted' },
};

/** SM-3: Project Lifecycle */
const PROJECT_TRANSITIONS: Record<string, Record<string, string>> = {
  planning: { activate: 'active', cancel: 'cancelled' },
  active: { hold: 'on_hold', complete: 'completed', cancel: 'cancelled' },
  on_hold: { resume: 'active', cancel: 'cancelled' },
};

/** SM-4: Task Lifecycle */
const TASK_TRANSITIONS: Record<string, Record<string, string>> = {
  todo: { start: 'in_progress', cancel: 'cancelled' },
  in_progress: { review: 'review', cancel: 'cancelled' },
  review: { approve: 'done', reject: 'in_progress', cancel: 'cancelled' },
};

/** T-1024: Required sections for plan submission */
const REQUIRED_SECTIONS_FOR_SUBMIT = [
  'sectionIDescription',
  'sectionIIObjectives',
  'sectionIVActivities',
  'sectionVPersonnel',
] as const;

/** T-1026: Required sections for plan approval */
const REQUIRED_SECTIONS_FOR_APPROVE = [
  ...REQUIRED_SECTIONS_FOR_SUBMIT,
  'sectionVIITimeline',
  'sectionIXBudget',
] as const;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── Plan Templates (T-1022) ──

  getTemplates() {
    return Object.entries(PLAN_TEMPLATES).map(([key, tmpl]) => ({
      key,
      planType: tmpl.planType,
      description: tmpl.sectionIDescription,
      sectionCount: Object.keys(tmpl).length,
    }));
  }

  async createPlanFromTemplate(
    orgId: string,
    templateKey: string,
    title: string,
    actorUserId: string,
  ) {
    const tmpl = PLAN_TEMPLATES[templateKey];
    if (!tmpl)
      throw new BadRequestException(
        `Unknown template: ${templateKey}. Available: ${Object.keys(PLAN_TEMPLATES).join(', ')}`,
      );

    const plan = await this.prisma.plan.create({
      data: { orgId, title, ...tmpl } as Prisma.PlanCreateInput,
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'project.plan_created_from_template',
      resource: 'Plan',
      resourceId: plan.id,
      newValue: { templateKey },
    });
    return plan;
  }

  // ── Plan CRUD ──

  async createPlan(
    orgId: string,
    data: {
      title: string;
      planType?: string;
      sectionIDescription?: string;
      sectionIIObjectives?: Prisma.InputJsonValue;
      sectionIIIOutcomes?: Prisma.InputJsonValue;
      sectionIVActivities?: Prisma.InputJsonValue;
      sectionVPersonnel?: Prisma.InputJsonValue;
      sectionVIContent?: Prisma.InputJsonValue;
      sectionVIITimeline?: Prisma.InputJsonValue;
      sectionVIIIProposal?: string;
      sectionIXBudget?: Prisma.InputJsonValue;
    },
    actorUserId: string,
  ) {
    const plan = await this.prisma.plan.create({ data: { orgId, ...data } });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'project.plan_created',
      resource: 'Plan',
      resourceId: plan.id,
    });
    return plan;
  }

  async updatePlan(
    orgId: string,
    planId: string,
    data: Partial<{
      title: string;
      sectionIDescription: string;
      sectionIIObjectives: Prisma.InputJsonValue;
      sectionIIIOutcomes: Prisma.InputJsonValue;
      sectionIVActivities: Prisma.InputJsonValue;
      sectionVPersonnel: Prisma.InputJsonValue;
      sectionVIContent: Prisma.InputJsonValue;
      sectionVIITimeline: Prisma.InputJsonValue;
      sectionVIIIProposal: string;
      sectionIXBudget: Prisma.InputJsonValue;
    }>,
    actorUserId: string,
  ) {
    const plan = await this.findPlanById(orgId, planId);
    if (plan.status !== 'draft' && plan.status !== 'rejected') {
      throw new BadRequestException('Plan can only be edited in draft or rejected status');
    }

    const oldValue = { title: plan.title, status: plan.status };
    const updated = await this.prisma.plan.update({ where: { id: planId }, data });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'project.plan_updated',
      resource: 'Plan',
      resourceId: planId,
      oldValue,
      newValue: data as Prisma.InputJsonValue,
    });
    return updated;
  }

  async findPlans(
    orgId: string,
    filters?: { status?: string; planType?: string },
    page = 1,
    limit = 20,
  ) {
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

  // T-1023: Plan version history
  async getPlanVersions(orgId: string, planId: string) {
    await this.findPlanById(orgId, planId);
    const logs = await this.prisma.auditLog.findMany({
      where: {
        orgId,
        resource: 'Plan',
        resourceId: planId,
        action: { startsWith: 'project.plan' },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { action: true, oldValue: true, newValue: true, createdAt: true, userId: true },
    });
    return { planId, versions: logs };
  }

  // T-1024 + T-1026: Validation + guard conditions
  private validatePlanForSubmit(plan: Record<string, unknown>): string[] {
    const missing: string[] = [];
    for (const field of REQUIRED_SECTIONS_FOR_SUBMIT) {
      const val = plan[field];
      if (val === null || val === undefined || val === '') missing.push(field);
    }
    return missing;
  }

  private validatePlanForApproval(plan: Record<string, unknown>): string[] {
    const missing: string[] = [];
    for (const field of REQUIRED_SECTIONS_FOR_APPROVE) {
      const val = plan[field];
      if (val === null || val === undefined || val === '') missing.push(field);
    }
    // Check activities have at least 1 item
    const activities = plan.sectionIVActivities;
    if (Array.isArray(activities) && activities.length === 0)
      missing.push('sectionIVActivities (empty)');
    // Check personnel has roles
    const personnel = plan.sectionVPersonnel as Record<string, unknown> | null;
    if (personnel && Array.isArray(personnel.roles) && personnel.roles.length === 0)
      missing.push('sectionVPersonnel.roles (empty)');
    return missing;
  }

  async transitionPlan(
    orgId: string,
    planId: string,
    action: string,
    actorUserId: string,
    rejectionReason?: string,
  ) {
    const plan = await this.findPlanById(orgId, planId);
    const allowed = PLAN_TRANSITIONS[plan.status];
    if (!allowed?.[action]) {
      throw new BadRequestException(`Action '${action}' not allowed from '${plan.status}'`);
    }

    // T-1024: Pre-submit validation
    if (action === 'submit') {
      const missing = this.validatePlanForSubmit(plan as unknown as Record<string, unknown>);
      if (missing.length > 0)
        throw new BadRequestException(
          `Cannot submit: missing required sections: ${missing.join(', ')}`,
        );
    }

    // T-1026: Pre-approval guard
    if (action === 'approve') {
      const missing = this.validatePlanForApproval(plan as unknown as Record<string, unknown>);
      if (missing.length > 0)
        throw new BadRequestException(`Cannot approve: incomplete sections: ${missing.join(', ')}`);
    }

    const newStatus = allowed[action];
    const oldValue = { status: plan.status };
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

    const updated = await this.prisma.plan.update({ where: { id: planId }, data: updateData });

    // T-1030: Domain events
    const eventMap: Record<string, string> = {
      submitted: DOMAIN_EVENTS.PROJECT.PLAN_SUBMITTED,
      approved: DOMAIN_EVENTS.PROJECT.PLAN_APPROVED,
    };
    if (eventMap[newStatus]) {
      await this.domainEvents.publish({
        orgId,
        eventType: eventMap[newStatus],
        aggregateId: planId,
        aggregateType: 'Plan',
        payload: { title: plan.title, oldStatus: plan.status, newStatus },
        actorUserId,
      });
    }

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: `project.plan_${action}`,
      resource: 'Plan',
      resourceId: planId,
      oldValue,
      newValue: { status: newStatus },
    });
    return updated;
  }

  // ── Project CRUD ──

  async createProject(
    orgId: string,
    data: {
      title: string;
      description?: string;
      projectType?: string;
      sourcePlanId?: string;
      objectives?: Prisma.InputJsonValue;
      keyResults?: Prisma.InputJsonValue;
      ownerId?: string;
      startDate?: string;
      endDate?: string;
      settings?: Prisma.InputJsonValue;
    },
    actorUserId: string,
  ) {
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
      orgId,
      userId: actorUserId,
      action: 'project.project_created',
      resource: 'Project',
      resourceId: project.id,
    });
    return project;
  }

  async findProjects(
    orgId: string,
    filters?: { status?: string; projectType?: string; ownerId?: string },
    page = 1,
    limit = 20,
  ) {
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
    if (!allowed?.[action])
      throw new BadRequestException(`Action '${action}' not allowed from '${project.status}'`);
    const newStatus = allowed[action];
    const oldValue = { status: project.status };

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: newStatus },
    });

    if (newStatus === 'completed') {
      await this.domainEvents.publish({
        orgId,
        eventType: DOMAIN_EVENTS.PROJECT.PROJECT_COMPLETED,
        aggregateId: projectId,
        aggregateType: 'Project',
        payload: { title: project.title },
        actorUserId,
      });
    }

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: `project.project_${action}`,
      resource: 'Project',
      resourceId: projectId,
      oldValue,
      newValue: { status: newStatus },
    });
    return updated;
  }

  // ── Task CRUD ──

  async createTask(
    orgId: string,
    projectId: string,
    data: {
      title: string;
      description?: string;
      taskType?: string;
      assigneeIds?: string[];
      reporterId?: string;
      startDate?: string;
      dueDate?: string;
      storyPoints?: number;
      priority?: string;
      tags?: string[];
      parentTaskId?: string;
      position?: number;
    },
    actorUserId: string,
  ) {
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

  async findTasks(
    orgId: string,
    projectId: string,
    filters?: { status?: string; priority?: string; assigneeId?: string },
    page = 1,
    limit = 50,
  ) {
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

  async updateTask(
    orgId: string,
    taskId: string,
    data: Partial<{
      title: string;
      description: string;
      assigneeIds: string[];
      startDate: string;
      dueDate: string;
      storyPoints: number;
      priority: string;
      tags: string[];
      position: number;
      status: string;
    }>,
    actorUserId: string,
  ) {
    const oldTask = await this.findTaskById(orgId, taskId);
    const oldValue = { title: oldTask.title, status: oldTask.status, priority: oldTask.priority };
    const updateData: Prisma.ProjectTaskUpdateInput = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);

    const task = await this.prisma.projectTask.update({
      where: { id: taskId, orgId },
      data: updateData,
    });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'project.task_updated',
      resource: 'ProjectTask',
      resourceId: taskId,
      oldValue,
      newValue: data as Prisma.InputJsonValue,
    });
    return task;
  }

  async transitionTask(orgId: string, taskId: string, action: string, actorUserId: string) {
    const task = await this.findTaskById(orgId, taskId);
    const allowed = TASK_TRANSITIONS[task.status];
    if (!allowed?.[action])
      throw new BadRequestException(`Action '${action}' not allowed from '${task.status}'`);
    const newStatus = allowed[action];
    const oldValue = { status: task.status };

    const updated = await this.prisma.projectTask.update({
      where: { id: taskId },
      data: { status: newStatus },
    });

    // T-1037: EXP hooks — emit reward event on task completion
    if (newStatus === 'done') {
      const expAmount = 10 + (task.storyPoints ?? 0) * 5;
      await this.domainEvents.publish({
        orgId,
        eventType: DOMAIN_EVENTS.PROJECT.TASK_COMPLETED,
        aggregateId: taskId,
        aggregateType: 'ProjectTask',
        payload: {
          taskId: task.id,
          title: task.title,
          projectId: task.projectId,
          expEarned: expAmount,
          assigneeIds: task.assigneeIds,
        },
        actorUserId,
      });
    }

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: `project.task_${action}`,
      resource: 'ProjectTask',
      resourceId: taskId,
      oldValue,
      newValue: { status: newStatus },
    });
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

  // ── T-1033: Calendar data adapter ──

  async getCalendarData(orgId: string, projectId: string) {
    await this.findProjectById(orgId, projectId);
    const tasks = await this.prisma.projectTask.findMany({
      where: { orgId, projectId, OR: [{ startDate: { not: null } }, { dueDate: { not: null } }] },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        startDate: true,
        dueDate: true,
        assigneeIds: true,
      },
      orderBy: { startDate: 'asc' },
    });
    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      start: t.startDate?.toISOString().slice(0, 10) ?? null,
      end: t.dueDate?.toISOString().slice(0, 10) ?? null,
      assigneeIds: t.assigneeIds,
    }));
  }

  // ── T-1036: Due alerts (already partially implemented — enhanced) ──

  async getDueAlerts(orgId: string, hoursAhead = 48) {
    const deadline = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
    const tasks = await this.prisma.projectTask.findMany({
      where: { orgId, status: { notIn: ['done', 'cancelled'] }, dueDate: { lte: deadline } },
      include: { project: { select: { title: true } } },
      orderBy: { dueDate: 'asc' },
    });
    return tasks.map((t) => ({
      taskId: t.id,
      title: t.title,
      projectTitle: t.project.title,
      dueDate: t.dueDate?.toISOString() ?? null,
      status: t.status,
      priority: t.priority,
      isOverdue: t.dueDate ? t.dueDate < new Date() : false,
    }));
  }

  // ── Auto-Generator (T-1027 RACI + T-1028 enhanced + T-1029 budget/timeline) ──

  async generateProjectFromPlan(orgId: string, planId: string, actorUserId: string) {
    const plan = await this.findPlanById(orgId, planId);
    if (plan.status !== 'approved')
      throw new BadRequestException('Plan must be approved before generating a project');
    if (plan.generatedProjectId)
      throw new BadRequestException('Project already generated from this plan');

    const activities =
      (plan.sectionIVActivities as Array<{ name: string; description?: string }>) ?? [];
    const objectives = plan.sectionIIObjectives ?? [];

    // T-1029: Extract timeline and budget from plan
    const timeline = plan.sectionVIITimeline as Record<string, unknown> | null;
    const budget = plan.sectionIXBudget as Record<string, unknown> | null;

    const project = await this.prisma.project.create({
      data: {
        orgId,
        title: plan.title,
        description: plan.sectionIDescription ?? undefined,
        projectType: plan.planType ?? undefined,
        sourcePlanId: planId,
        objectives: objectives as Prisma.InputJsonValue,
        // T-1029: Propagate budget into project settings
        settings: budget ? ({ budget } as Prisma.InputJsonValue) : {},
        // T-1029: Propagate timeline dates
        startDate: (() => {
          const s = timeline && (timeline as Record<string, string>).startDate;
          return typeof s === 'string' ? new Date(s) : undefined;
        })(),
        endDate: (() => {
          const e = timeline && (timeline as Record<string, string>).endDate;
          return typeof e === 'string' ? new Date(e) : undefined;
        })(),
        createdBy: actorUserId,
      },
    });

    // T-1027: Parse RACI personnel and map to task assignees
    const personnel = plan.sectionVPersonnel as {
      roles?: Array<{ role: string; raci: string; userId?: string }>;
    } | null;
    const responsibleUserIds =
      personnel?.roles?.filter((r) => r.raci === 'R' && r.userId).map((r) => r.userId!) ?? [];

    const taskOps = activities.map((activity, idx) =>
      this.prisma.projectTask.create({
        data: {
          orgId,
          projectId: project.id,
          title: activity.name ?? `Task ${idx + 1}`,
          description: activity.description ?? undefined,
          position: idx,
          assigneeIds: responsibleUserIds,
          createdBy: actorUserId,
        },
      }),
    );

    await Promise.all(taskOps);
    await this.prisma.plan.update({
      where: { id: planId },
      data: { generatedProjectId: project.id },
    });

    // T-1030: Emit domain event
    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.PROJECT.PLAN_APPROVED,
      aggregateId: project.id,
      aggregateType: 'Project',
      payload: { title: project.title, sourcePlanId: planId, tasksCreated: activities.length },
      actorUserId,
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'project.project_generated_from_plan',
      resource: 'Project',
      resourceId: project.id,
      newValue: { planId, tasksCreated: activities.length },
    });

    return this.findProjectById(orgId, project.id);
  }
}
