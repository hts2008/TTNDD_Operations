import { ForbiddenException } from '@nestjs/common';
import { HrmService } from './hrm.service';

describe('HrmService privacy export', () => {
  const orgId = 'org-1';
  const memberId = 'member-1';
  const profileId = 'profile-1';

  let prisma: any;
  let audit: { log: jest.Mock };
  let validation: { checkCompliance: jest.Mock };
  let service: HrmService;

  const member = {
    id: memberId,
    orgId,
    userId: 'user-1',
    role: 'member',
    status: 'active',
    memberCode: 'M001',
    scoutName: 'Scout One',
    heroName: null,
    joinedDate: new Date('2026-01-01T00:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    user: {
      id: 'user-1',
      displayName: 'Scout One',
      email: 'scout@example.com',
      avatarUrl: null,
      phone: '0900000000',
    },
    branch: { id: 'branch-1', name: 'Branch One' },
    unit: null,
    profile: {
      id: profileId,
      fullName: 'Scout One',
      personalEmail: 'scout@example.com',
    },
    guardianLinks: [{ id: 'guardian-1', fullName: 'Guardian One', relation: 'parent' }],
    branchHistory: [],
  };

  beforeEach(() => {
    prisma = {
      orgMember: { findFirst: jest.fn().mockResolvedValue(member) },
      domainEvent: { findMany: jest.fn().mockResolvedValue([]) },
      memberBranchHistory: { findMany: jest.fn().mockResolvedValue([]) },
      memberFee: { findMany: jest.fn().mockResolvedValue([]) },
      memberExpSummary: {
        findFirst: jest.fn().mockResolvedValue({
          totalExp: 20,
          availableExp: 15,
          tier1Count: 1,
          tier2Count: 0,
          tier3Count: 0,
          tier4Count: 0,
          penaltyCount: 0,
          lastUpdated: new Date('2026-01-02T00:00:00Z'),
        }),
      },
      memberBadge: { findMany: jest.fn().mockResolvedValue([]) },
      memberRank: { findMany: jest.fn().mockResolvedValue([]) },
      sessionAttendance: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    };
    audit = { log: jest.fn().mockResolvedValue({}) };
    validation = {
      checkCompliance: jest.fn().mockResolvedValue({ compliant: true, violations: [] }),
    };

    service = new HrmService(
      prisma,
      { publish: jest.fn() } as any,
      audit as any,
      { transition: jest.fn(), getAllowedActions: jest.fn() } as any,
      validation as any,
    );
  });

  it('exports personal data for the member themself and writes an audit log', async () => {
    const result = await service.exportPersonalData(orgId, memberId, {
      userId: 'user-1',
      role: 'member',
      memberId,
    });

    expect(result.subject).toMatchObject({
      orgId,
      memberId,
      requestedByUserId: 'user-1',
      selfService: true,
    });
    expect(result.subject.categories).toContain('audit_trail');
    expect(result.identity.profile).toMatchObject({ id: profileId, fullName: 'Scout One' });
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId,
          OR: expect.arrayContaining([
            { resource: 'OrgMember', resourceId: memberId },
            { resource: 'MemberProfile', resourceId: profileId },
          ]),
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId,
        userId: 'user-1',
        action: 'hrm.privacy_exported',
        resource: 'OrgMember',
        resourceId: memberId,
        newValue: expect.objectContaining({
          selfService: true,
          categories: expect.arrayContaining(['identity', 'audit_trail']),
        }),
      }),
    );
  });

  it('allows privileged staff to export a member data package', async () => {
    const result = await service.exportPersonalData(orgId, memberId, {
      userId: 'admin-user',
      role: 'admin',
      memberId: 'admin-member',
    });

    expect(result.subject.selfService).toBe(false);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-user',
        newValue: expect.objectContaining({ requestedByRole: 'admin', selfService: false }),
      }),
    );
  });

  it('blocks a non-privileged member from exporting another member data package', async () => {
    await expect(
      service.exportPersonalData(orgId, memberId, {
        userId: 'other-user',
        role: 'member',
        memberId: 'other-member',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.orgMember.findFirst).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });
});
