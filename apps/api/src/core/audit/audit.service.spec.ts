import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../database';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: { auditLog: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('log', () => {
    it('should create an audit entry', async () => {
      await service.log({
        orgId: 'org-1',
        userId: 'user-1',
        action: 'member.invited',
        resource: 'OrgMember',
        resourceId: 'm-1',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId: 'org-1',
          action: 'member.invited',
          resource: 'OrgMember',
        }),
      });
    });
  });

  describe('findByOrg', () => {
    it('should query by orgId', async () => {
      await service.findByOrg('org-1');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: 'org-1' },
          skip: 0,
          take: 50,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should apply action filter', async () => {
      await service.findByOrg('org-1', { action: 'member.invited' });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'member.invited' }),
        }),
      );
    });

    it('should apply date range filter', async () => {
      const from = new Date('2026-01-01');
      const to = new Date('2026-03-01');
      await service.findByOrg('org-1', { from, to });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: from, lte: to },
          }),
        }),
      );
    });

    it('should paginate', async () => {
      prisma.auditLog.count.mockResolvedValue(100);
      const result = await service.findByOrg('org-1', undefined, 2, 10);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.meta).toEqual({ total: 100, page: 2, limit: 10 });
    });
  });
});
