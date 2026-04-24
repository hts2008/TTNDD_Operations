import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let domainEvents: { publish: jest.Mock };
  let audit: { log: jest.Mock };

  const ORG_ID = 'org-test-1';
  const USER_ID = 'user-test-1';

  beforeEach(async () => {
    prisma = {
      plan: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      project: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      projectTask: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    domainEvents = { publish: jest.fn().mockResolvedValue(undefined) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainEventService, useValue: domainEvents },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  // ── SM-2: Plan CRUD & Transitions ──

  describe('createPlan', () => {
    it('should create a plan and log audit', async () => {
      const planData = { title: 'Kế hoạch Trại Hè 2026' };
      prisma.plan.create.mockResolvedValue({ id: 'plan-1', orgId: ORG_ID, ...planData, status: 'draft' });

      const result = await service.createPlan(ORG_ID, planData, USER_ID);

      expect(result.title).toBe('Kế hoạch Trại Hè 2026');
      expect(prisma.plan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ orgId: ORG_ID, title: 'Kế hoạch Trại Hè 2026' }),
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'project.plan_created', resource: 'Plan' }),
      );
    });
  });

  describe('findPlans', () => {
    it('should paginate plans', async () => {
      prisma.plan.findMany.mockResolvedValue([]);
      prisma.plan.count.mockResolvedValue(42);

      const result = await service.findPlans(ORG_ID, {}, 2, 10);

      expect(result.meta).toEqual({ total: 42, page: 2, limit: 10 });
      expect(prisma.plan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by status', async () => {
      prisma.plan.findMany.mockResolvedValue([]);
      prisma.plan.count.mockResolvedValue(0);

      await service.findPlans(ORG_ID, { status: 'submitted' });

      expect(prisma.plan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orgId: ORG_ID, status: 'submitted' } }),
      );
    });
  });

  describe('transitionPlan (SM-2)', () => {
    it('should submit a draft plan', async () => {
      prisma.plan.findFirst.mockResolvedValue({ id: 'plan-1', orgId: ORG_ID, status: 'draft', title: 'Test' });
      prisma.plan.update.mockResolvedValue({ id: 'plan-1', status: 'submitted' });

      const result = await service.transitionPlan(ORG_ID, 'plan-1', 'submit', USER_ID);

      expect(result.status).toBe('submitted');
      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'project.plan_submitted' }),
      );
    });

    it('should approve a submitted plan', async () => {
      prisma.plan.findFirst.mockResolvedValue({ id: 'plan-1', orgId: ORG_ID, status: 'submitted', title: 'Test' });
      prisma.plan.update.mockResolvedValue({ id: 'plan-1', status: 'approved' });

      const result = await service.transitionPlan(ORG_ID, 'plan-1', 'approve', USER_ID);

      expect(result.status).toBe('approved');
    });

    it('should reject invalid transition', async () => {
      prisma.plan.findFirst.mockResolvedValue({ id: 'plan-1', orgId: ORG_ID, status: 'draft', title: 'Test' });

      await expect(
        service.transitionPlan(ORG_ID, 'plan-1', 'approve', USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a submitted plan with reason', async () => {
      prisma.plan.findFirst.mockResolvedValue({ id: 'plan-1', orgId: ORG_ID, status: 'submitted', title: 'Test' });
      prisma.plan.update.mockResolvedValue({ id: 'plan-1', status: 'rejected' });

      await service.transitionPlan(ORG_ID, 'plan-1', 'reject', USER_ID, 'Thiếu mục ngân sách');

      expect(prisma.plan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: expect.objectContaining({ status: 'rejected', rejectionReason: 'Thiếu mục ngân sách' }),
      });
    });
  });

  // ── SM-3: Project CRUD & Transitions ──

  describe('createProject', () => {
    it('should create project with dates', async () => {
      const data = { title: 'Dự án Trại Hè', startDate: '2026-06-01', endDate: '2026-06-07' };
      prisma.project.create.mockResolvedValue({ id: 'proj-1', ...data });

      await service.createProject(ORG_ID, data, USER_ID);

      expect(prisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId: ORG_ID,
          title: 'Dự án Trại Hè',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          createdBy: USER_ID,
        }),
      });
    });
  });

  describe('transitionProject (SM-3)', () => {
    it('should activate a planning project', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1', orgId: ORG_ID, status: 'planning', title: 'Test',
        projectTasks: [],
      });
      prisma.project.update.mockResolvedValue({ id: 'proj-1', status: 'active' });

      const result = await service.transitionProject(ORG_ID, 'proj-1', 'activate', USER_ID);
      expect(result.status).toBe('active');
    });

    it('should reject activating a completed project', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1', orgId: ORG_ID, status: 'completed', title: 'Test',
        projectTasks: [],
      });

      await expect(
        service.transitionProject(ORG_ID, 'proj-1', 'activate', USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── SM-4: Task CRUD & Transitions ──

  describe('transitionTask (SM-4)', () => {
    it('should start a todo task', async () => {
      prisma.projectTask.findFirst.mockResolvedValue({
        id: 'task-1', orgId: ORG_ID, status: 'todo', title: 'Task 1',
        projectId: 'proj-1', project: { title: 'P', status: 'active' }, subTasks: [],
      });
      prisma.projectTask.update.mockResolvedValue({ id: 'task-1', status: 'in_progress' });

      const result = await service.transitionTask(ORG_ID, 'task-1', 'start', USER_ID);
      expect(result.status).toBe('in_progress');
    });

    it('should emit event on task completion', async () => {
      prisma.projectTask.findFirst.mockResolvedValue({
        id: 'task-1', orgId: ORG_ID, status: 'review', title: 'Task 1',
        projectId: 'proj-1', project: { title: 'P', status: 'active' }, subTasks: [],
      });
      prisma.projectTask.update.mockResolvedValue({ id: 'task-1', status: 'done' });

      await service.transitionTask(ORG_ID, 'task-1', 'approve', USER_ID);

      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'project.task_completed' }),
      );
    });
  });

  // ── Kanban ──

  describe('getKanban', () => {
    it('should group tasks by status', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'proj-1', orgId: ORG_ID, projectTasks: [] });
      prisma.projectTask.findMany.mockResolvedValue([
        { id: 't1', status: 'todo' },
        { id: 't2', status: 'in_progress' },
        { id: 't3', status: 'done' },
      ]);

      const result = await service.getKanban(ORG_ID, 'proj-1');

      expect(result.columns.todo).toHaveLength(1);
      expect(result.columns.in_progress).toHaveLength(1);
      expect(result.columns.done).toHaveLength(1);
    });
  });

  // ── Auto-Generator ──

  describe('generateProjectFromPlan', () => {
    it('should generate project from approved plan with tasks', async () => {
      prisma.plan.findFirst.mockResolvedValue({
        id: 'plan-1', orgId: ORG_ID, status: 'approved', title: 'Trại Hè',
        sectionIDescription: 'Mô tả', sectionIIObjectives: [],
        sectionIVActivities: [
          { name: 'Nghiên cứu địa điểm' },
          { name: 'Chuẩn bị hậu cần' },
        ],
        generatedProjectId: null,
      });
      prisma.project.create.mockResolvedValue({ id: 'proj-gen-1', orgId: ORG_ID, title: 'Trại Hè' });
      prisma.projectTask.create.mockResolvedValue({});
      prisma.plan.update.mockResolvedValue({});
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-gen-1', title: 'Trại Hè', projectTasks: [
          { title: 'Nghiên cứu địa điểm' },
          { title: 'Chuẩn bị hậu cần' },
        ],
      });

      const result = await service.generateProjectFromPlan(ORG_ID, 'plan-1', USER_ID);

      expect(prisma.projectTask.create).toHaveBeenCalledTimes(2);
      expect(prisma.plan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: { generatedProjectId: 'proj-gen-1' },
      });
    });

    it('should reject generating from unapproved plan', async () => {
      prisma.plan.findFirst.mockResolvedValue({
        id: 'plan-1', orgId: ORG_ID, status: 'draft', title: 'Test',
      });

      await expect(
        service.generateProjectFromPlan(ORG_ID, 'plan-1', USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject re-generating from already-generated plan', async () => {
      prisma.plan.findFirst.mockResolvedValue({
        id: 'plan-1', orgId: ORG_ID, status: 'approved', title: 'Test',
        generatedProjectId: 'existing-proj',
      });

      await expect(
        service.generateProjectFromPlan(ORG_ID, 'plan-1', USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
