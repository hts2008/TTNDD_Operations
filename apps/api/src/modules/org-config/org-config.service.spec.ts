import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrgConfigService } from './org-config.service';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';

describe('OrgConfigService', () => {
  let service: OrgConfigService;
  let prisma: any;
  let domainEvents: { publish: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      organization: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation((args) => Promise.resolve({ id: 'org-new', ...args.data })),
      },
      branch: {
        findFirst: jest.fn(),
        delete: jest.fn().mockResolvedValue({ id: 'b-1' }),
      },
      unit: {
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        delete: jest.fn().mockResolvedValue({ id: 'u-1' }),
      },
      orgMember: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    domainEvents = { publish: jest.fn().mockResolvedValue(undefined) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgConfigService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainEventService, useValue: domainEvents },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<OrgConfigService>(OrgConfigService);
  });

  // ── createOrganization ─────────────────────────────────

  describe('createOrganization', () => {
    it('should create org with slug', async () => {
      const result = await service.createOrganization(
        { name: 'Test Org', slug: 'test-org' },
        'user-1',
      );
      expect(prisma.organization.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
      expect(domainEvents.publish).toHaveBeenCalled();
    });

    it('should reject duplicate slug', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.createOrganization({ name: 'Test', slug: 'existing-slug' }, 'u-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── deleteBranch ───────────────────────────────────────

  describe('deleteBranch', () => {
    it('should delete branch with no active members', async () => {
      prisma.branch.findFirst.mockResolvedValue({ id: 'b-1', orgId: 'org-1' });
      prisma.orgMember.count.mockResolvedValue(0);

      const result = await service.deleteBranch('org-1', 'b-1', 'actor-1');
      expect(prisma.branch.delete).toHaveBeenCalledWith({ where: { id: 'b-1' } });
      expect(audit.log).toHaveBeenCalled();
    });

    it('should reject deletion when branch has active members', async () => {
      prisma.branch.findFirst.mockResolvedValue({ id: 'b-1', orgId: 'org-1' });
      prisma.orgMember.count.mockResolvedValue(5);

      await expect(service.deleteBranch('org-1', 'b-1', 'a-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for invalid branch', async () => {
      prisma.branch.findFirst.mockResolvedValue(null);
      await expect(service.deleteBranch('org-1', 'invalid', 'a-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── deleteUnit ─────────────────────────────────────────

  describe('deleteUnit', () => {
    it('should delete unit with no members and no children', async () => {
      prisma.unit.findFirst.mockResolvedValueOnce({ id: 'u-1', orgId: 'org-1' }); // unit lookup
      prisma.orgMember.count.mockResolvedValue(0);
      prisma.unit.findFirst.mockResolvedValueOnce(null); // no child units

      const result = await service.deleteUnit('org-1', 'u-1', 'actor-1');
      expect(prisma.unit.delete).toHaveBeenCalledWith({ where: { id: 'u-1' } });
    });

    it('should reject when unit has active members', async () => {
      prisma.unit.findFirst.mockResolvedValueOnce({ id: 'u-1', orgId: 'org-1' });
      prisma.orgMember.count.mockResolvedValue(3);

      await expect(service.deleteUnit('org-1', 'u-1', 'a-1')).rejects.toThrow(BadRequestException);
    });
  });
});
