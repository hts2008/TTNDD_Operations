import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { IamService } from './iam.service';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';

describe('IamService', () => {
  let service: IamService;
  let prisma: any;
  let domainEvents: { publish: jest.Mock };
  let audit: { log: jest.Mock };

  const mockMember = {
    id: 'mem-1',
    orgId: 'org-1',
    userId: 'u-1',
    role: 'member',
    status: 'active',
    branchId: 'b-1',
    unitId: null,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'u-new', email: 'test@test.com' }),
      },
      orgMember: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(mockMember),
        create: jest
          .fn()
          .mockImplementation((args) => Promise.resolve({ id: 'mem-new', ...args.data })),
        update: jest
          .fn()
          .mockImplementation((args) => Promise.resolve({ ...mockMember, ...args.data })),
      },
    };
    domainEvents = { publish: jest.fn().mockResolvedValue(undefined) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IamService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainEventService, useValue: domainEvents },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<IamService>(IamService);
  });

  // ── inviteMember ───────────────────────────────────────

  describe('inviteMember', () => {
    it('should create user + orgMember for new user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.inviteMember(
        'org-1',
        { email: 'new@test.com', role: 'member' },
        'actor-1',
        'admin',
      );
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.orgMember.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
      expect(domainEvents.publish).toHaveBeenCalled();
    });

    it('should reject invalid role', async () => {
      await expect(
        service.inviteMember('org-1', { email: 'a@b.com', role: 'invalid_role' }, 'a-1', 'admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent escalation (member trying to assign leader)', async () => {
      await expect(
        service.inviteMember('org-1', { email: 'a@b.com', role: 'leader' }, 'a-1', 'member'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent assigning same-level role', async () => {
      await expect(
        service.inviteMember('org-1', { email: 'a@b.com', role: 'admin' }, 'a-1', 'admin'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException for existing active member', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
      prisma.orgMember.findUnique.mockResolvedValue({ ...mockMember, status: 'active' });

      await expect(
        service.inviteMember('org-1', { email: 'a@b.com', role: 'member' }, 'a-1', 'admin'),
      ).rejects.toThrow(ConflictException);
    });

    it('should reactivate inactive member on re-invite', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
      prisma.orgMember.findUnique.mockResolvedValue({ ...mockMember, status: 'inactive' });

      const result = await service.inviteMember(
        'org-1',
        { email: 'a@b.com', role: 'member' },
        'a-1',
        'admin',
      );
      expect(prisma.orgMember.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'active' }) }),
      );
    });
  });

  // ── updateMemberRole ───────────────────────────────────

  describe('updateMemberRole', () => {
    it('should update role when escalation guard passes', async () => {
      await service.updateMemberRole('org-1', 'mem-1', 'sub_leader', 'actor-1', 'admin');
      expect(prisma.orgMember.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: 'sub_leader' } }),
      );
      expect(audit.log).toHaveBeenCalled();
      expect(domainEvents.publish).toHaveBeenCalled();
    });

    it('should reject escalation: admin assigning super_admin', async () => {
      await expect(
        service.updateMemberRole('org-1', 'mem-1', 'super_admin', 'a-1', 'admin'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject modifying member with higher role', async () => {
      prisma.orgMember.findFirst.mockResolvedValue({ ...mockMember, role: 'admin' });
      await expect(
        service.updateMemberRole('org-1', 'mem-1', 'member', 'a-1', 'leader'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── deactivateMember ───────────────────────────────────

  describe('deactivateMember', () => {
    it('should deactivate active member', async () => {
      await service.deactivateMember('org-1', 'mem-1', 'actor-1', 'admin');
      expect(prisma.orgMember.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'inactive' } }),
      );
    });

    it('should reject deactivating already inactive member', async () => {
      prisma.orgMember.findFirst.mockResolvedValue({ ...mockMember, status: 'inactive' });
      await expect(service.deactivateMember('org-1', 'mem-1', 'a-1', 'admin')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject deactivating higher-role member', async () => {
      prisma.orgMember.findFirst.mockResolvedValue({ ...mockMember, role: 'admin' });
      await expect(service.deactivateMember('org-1', 'mem-1', 'a-1', 'leader')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── reactivateMember ───────────────────────────────────

  describe('reactivateMember', () => {
    it('should reactivate inactive member', async () => {
      prisma.orgMember.findFirst.mockResolvedValue({ ...mockMember, status: 'inactive' });
      await service.reactivateMember('org-1', 'mem-1', 'actor-1');
      expect(prisma.orgMember.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'active' } }),
      );
    });

    it('should reject reactivating active member', async () => {
      await expect(service.reactivateMember('org-1', 'mem-1', 'a-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── removeMember ───────────────────────────────────────

  describe('removeMember', () => {
    it('should soft-delete member (status=left)', async () => {
      await service.removeMember('org-1', 'mem-1', 'actor-1', 'admin');
      expect(prisma.orgMember.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'left' } }),
      );
      expect(domainEvents.publish).toHaveBeenCalled();
    });

    it('should reject removing higher-role member', async () => {
      prisma.orgMember.findFirst.mockResolvedValue({ ...mockMember, role: 'admin' });
      await expect(service.removeMember('org-1', 'mem-1', 'a-1', 'leader')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── getRoles ───────────────────────────────────────────

  describe('getRoles', () => {
    it('should return 5 roles with formatted labels', () => {
      const roles = service.getRoles();
      expect(roles).toHaveLength(5);
      expect(roles[0]).toEqual({ value: 'member', label: 'Member' });
    });
  });
});
