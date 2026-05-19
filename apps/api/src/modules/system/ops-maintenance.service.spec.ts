import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../core/database';
import { OpsMaintenanceService } from './ops-maintenance.service';

describe('OpsMaintenanceService', () => {
  let service: OpsMaintenanceService;
  let prisma: {
    domainEvent: { deleteMany: jest.Mock; count: jest.Mock };
    organization: { count: jest.Mock };
    user: { count: jest.Mock };
    notificationDeliveryLog: { count: jest.Mock };
    importBatch: { count: jest.Mock };
    releaseGateReport: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      domainEvent: {
        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
        count: jest.fn().mockResolvedValue(0),
      },
      organization: { count: jest.fn().mockResolvedValue(1) },
      user: { count: jest.fn().mockResolvedValue(5) },
      notificationDeliveryLog: { count: jest.fn().mockResolvedValue(0) },
      importBatch: { count: jest.fn().mockResolvedValue(0) },
      releaseGateReport: {
        create: jest.fn().mockResolvedValue({ id: 'report-1', status: 'PASS' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OpsMaintenanceService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(OpsMaintenanceService);
  });

  it('deletes processed domain events outside the retention window', async () => {
    const result = await service.cleanupProcessedDomainEvents(7);

    expect(result.deletedDomainEvents).toBe(3);
    expect(prisma.domainEvent.deleteMany).toHaveBeenCalledWith({
      where: {
        processed: true,
        processedAt: { lt: expect.any(Date) },
      },
    });
  });

  it('creates an observable scheduled ops report with PASS status when queues are clear', async () => {
    const result = await service.generateOpsReport();

    expect(result).toEqual({ id: 'report-1', status: 'PASS' });
    expect(prisma.releaseGateReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        environment: 'scheduled-worker',
        profile: 'PROFILE_OPS',
        status: 'PASS',
        reportJson: expect.objectContaining({
          generatedBy: 'ops-maintenance',
          counts: {
            organizations: 1,
            activeUsers: 5,
            unprocessedDomainEvents: 0,
            pendingNotificationDeliveries: 0,
            activeImportBatches: 0,
          },
        }),
      }),
    });
  });

  it('marks ops report WARN when async backlogs exist', async () => {
    prisma.domainEvent.count.mockResolvedValue(2);
    prisma.releaseGateReport.create.mockResolvedValue({ id: 'report-2', status: 'WARN' });

    await service.generateOpsReport();

    expect(prisma.releaseGateReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'WARN' }),
      }),
    );
  });
});
