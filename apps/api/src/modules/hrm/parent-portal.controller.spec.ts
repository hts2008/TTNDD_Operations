import { ParentPortalController } from './parent-portal.controller';

describe('ParentPortalController', () => {
  const user = {
    userId: 'user-1',
    orgId: 'org-1',
    role: 'parent',
    email: 'parent@example.com',
    firebaseUid: 'firebase-1',
  };

  let prisma: {
    withRLS: jest.Mock;
    user: { findUnique: jest.Mock };
    guardianLink: { findMany: jest.Mock };
    orgMember: { findMany: jest.Mock };
    auditLog: { findMany: jest.Mock; create: jest.Mock };
  };
  let validation: { checkCompliance: jest.Mock };
  let controller: ParentPortalController;

  beforeEach(() => {
    prisma = {
      withRLS: jest.fn((orgId, userId, role, fn, memberId) => fn(prisma)),
      user: { findUnique: jest.fn() },
      guardianLink: { findMany: jest.fn() },
      orgMember: { findMany: jest.fn() },
      auditLog: { findMany: jest.fn(), create: jest.fn().mockResolvedValue({}) },
    };
    validation = {
      checkCompliance: jest.fn().mockResolvedValue({ compliant: true, violations: [] }),
    };
    controller = new ParentPortalController(prisma as any, validation as any);
  });

  it('returns only children linked by guardian email or phone', async () => {
    prisma.user.findUnique.mockResolvedValue({ email: 'parent@example.com', phone: '0900000000' });
    prisma.guardianLink.findMany.mockResolvedValue([{ orgMemberId: 'child-1' }]);
    prisma.orgMember.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'child-1',
        memberCode: 'M001',
        scoutName: 'Child One',
        status: 'active',
        profile: { fullName: 'Child One' },
        branch: { name: 'Nganh Thieu' },
        unit: { name: 'Unit A' },
      },
    ]);
    prisma.auditLog.findMany.mockResolvedValue([
      {
        action: 'hrm.member_updated',
        resource: 'OrgMember',
        createdAt: new Date('2026-05-01T00:00:00Z'),
      },
    ]);

    const result = await controller.getDashboard(user);

    expect(result.children).toHaveLength(1);
    expect(result.children[0]!.id).toBe('child-1');
    expect(prisma.orgMember.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { orgId: 'org-1', id: { in: ['child-1'] } },
      }),
    );
    expect(prisma.withRLS).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      'parent',
      expect.any(Function),
      undefined,
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'parent_portal.dashboard_viewed',
          newValue: { childrenViewed: 1, childIds: ['child-1'] },
        }),
      }),
    );
  });

  it('uses parent org member linkedBy relation when no contact guardian links exist', async () => {
    prisma.user.findUnique.mockResolvedValue({ email: null, phone: null });
    prisma.guardianLink.findMany.mockResolvedValue([]);
    prisma.orgMember.findMany
      .mockResolvedValueOnce([{ linkedBy: [{ id: 'child-2' }] }])
      .mockResolvedValueOnce([
        {
          id: 'child-2',
          memberCode: 'M002',
          scoutName: 'Child Two',
          status: 'active',
          profile: { fullName: 'Child Two' },
          branch: null,
          unit: null,
        },
      ]);
    prisma.auditLog.findMany.mockResolvedValue([]);

    const result = await controller.getDashboard(user);

    expect(result.children.map((child) => child.id)).toEqual(['child-2']);
    expect(prisma.guardianLink.findMany).not.toHaveBeenCalled();
  });

  it('denies unrelated guardians by returning an empty dashboard and still auditing access', async () => {
    prisma.user.findUnique.mockResolvedValue({ email: 'other@example.com', phone: null });
    prisma.guardianLink.findMany.mockResolvedValue([]);
    prisma.orgMember.findMany.mockResolvedValueOnce([]);

    const result = await controller.getDashboard(user);

    expect(result).toEqual({ children: [], accessLogs: [] });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'parent_portal.dashboard_viewed',
          newValue: { childrenViewed: 0, childIds: [] },
        }),
      }),
    );
  });
});
