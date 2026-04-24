import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProcessService } from './process.service';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';

describe('ProcessService', () => {
  let service: ProcessService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let domainEvents: { publish: jest.Mock };
  let audit: { log: jest.Mock };

  const ORG_ID = 'org-test-1';
  const USER_ID = 'user-test-1';

  beforeEach(async () => {
    prisma = {
      workflowDefinition: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      workflowRun: {
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
        ProcessService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainEventService, useValue: domainEvents },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<ProcessService>(ProcessService);
  });

  // ── Workflow Definitions ──

  describe('createDefinition', () => {
    it('should create a definition with steps', async () => {
      const steps = [{ name: 'Duyệt', type: 'approval', assigneeRole: 'admin' }];
      prisma.workflowDefinition.create.mockResolvedValue({
        id: 'def-1', name: 'Quy trình xét duyệt', steps,
      });

      const result = await service.createDefinition(ORG_ID, {
        name: 'Quy trình xét duyệt', steps,
      }, USER_ID);

      expect(result.name).toBe('Quy trình xét duyệt');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'process.definition_created' }),
      );
    });

    it('should reject definition without steps', async () => {
      await expect(
        service.createDefinition(ORG_ID, { name: 'Empty', steps: [] }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Workflow Runs (SM-9) ──

  describe('startRun', () => {
    it('should start a run for active definition', async () => {
      const steps = [{ name: 'Step 1', type: 'task' }];
      prisma.workflowDefinition.findFirst.mockResolvedValue({
        id: 'def-1', orgId: ORG_ID, isActive: true, steps,
        runs: [],
      });
      prisma.workflowRun.create.mockResolvedValue({
        id: 'run-1', status: 'in_progress', currentStep: 0,
      });

      const result = await service.startRun(ORG_ID, 'def-1', USER_ID);

      expect(result.status).toBe('in_progress');
      expect(prisma.workflowRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId: ORG_ID, definitionId: 'def-1', status: 'in_progress',
        }),
      });
    });

    it('should reject starting run for inactive definition', async () => {
      prisma.workflowDefinition.findFirst.mockResolvedValue({
        id: 'def-1', orgId: ORG_ID, isActive: false, steps: [{ name: 'S', type: 'task' }],
        runs: [],
      });

      await expect(
        service.startRun(ORG_ID, 'def-1', USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('advanceStep', () => {
    it('should advance to next step on approval', async () => {
      const steps = [
        { name: 'Step 1', type: 'approval' },
        { name: 'Step 2', type: 'task' },
      ];
      prisma.workflowRun.findFirst.mockResolvedValue({
        id: 'run-1', orgId: ORG_ID, status: 'in_progress', currentStep: 0,
        definition: { steps },
        stepResults: [{ stepIndex: 0, status: 'pending' }, { stepIndex: 1, status: 'pending' }],
      });
      prisma.workflowRun.update.mockResolvedValue({
        id: 'run-1', currentStep: 1, status: 'in_progress',
      });

      const result = await service.advanceStep(ORG_ID, 'run-1', {
        status: 'approved', notes: 'Đồng ý',
      }, USER_ID);

      expect(result.currentStep).toBe(1);
    });

    it('should complete run when reaching last step', async () => {
      const steps = [{ name: 'Only Step', type: 'task' }];
      prisma.workflowRun.findFirst.mockResolvedValue({
        id: 'run-1', orgId: ORG_ID, status: 'in_progress', currentStep: 0,
        definition: { steps },
        stepResults: [{ stepIndex: 0, status: 'pending' }],
      });
      prisma.workflowRun.update.mockResolvedValue({
        id: 'run-1', status: 'completed',
      });

      const result = await service.advanceStep(ORG_ID, 'run-1', {
        status: 'completed',
      }, USER_ID);

      expect(result.status).toBe('completed');
    });

    it('should cancel run on approval rejection', async () => {
      const steps = [{ name: 'Approval', type: 'approval' }];
      prisma.workflowRun.findFirst.mockResolvedValue({
        id: 'run-1', orgId: ORG_ID, status: 'in_progress', currentStep: 0,
        definition: { steps },
        stepResults: [{ stepIndex: 0, status: 'pending' }],
      });
      prisma.workflowRun.update.mockResolvedValue({
        id: 'run-1', status: 'cancelled',
      });

      const result = await service.advanceStep(ORG_ID, 'run-1', {
        status: 'rejected',
      }, USER_ID);

      expect(result.status).toBe('cancelled');
    });

    it('should reject advancing a completed run', async () => {
      prisma.workflowRun.findFirst.mockResolvedValue({
        id: 'run-1', orgId: ORG_ID, status: 'completed', currentStep: 0,
        definition: { steps: [] },
      });

      await expect(
        service.advanceStep(ORG_ID, 'run-1', { status: 'completed' }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeRun', () => {
    it('should complete an in-progress run', async () => {
      prisma.workflowRun.findFirst.mockResolvedValue({
        id: 'run-1', orgId: ORG_ID, status: 'in_progress',
      });
      prisma.workflowRun.update.mockResolvedValue({
        id: 'run-1', status: 'completed',
      });

      const result = await service.completeRun(ORG_ID, 'run-1', USER_ID);

      expect(result.status).toBe('completed');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'process.run_completed' }),
      );
    });

    it('should reject completing a cancelled run', async () => {
      prisma.workflowRun.findFirst.mockResolvedValue({
        id: 'run-1', orgId: ORG_ID, status: 'cancelled',
      });

      await expect(
        service.completeRun(ORG_ID, 'run-1', USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
