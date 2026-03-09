import { GuardianService } from './guardian.service';

// Mocks
const mockPrisma = {
  orgMember: {
    findFirst: jest.fn(),
  },
  guardianLink: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
};

const mockDomainEvents = { publish: jest.fn() };
const mockAudit = { log: jest.fn() };

describe('GuardianService', () => {
  let service: GuardianService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GuardianService(mockPrisma as any, mockDomainEvents as any, mockAudit as any);
  });

  // ── linkGuardian ──────────────────────────────────────

  describe('linkGuardian', () => {
    it('should create a guardian link for a member', async () => {
      const member = { id: 'member-1', orgId: 'org-1', guardianLinks: [] };
      mockPrisma.orgMember.findFirst.mockResolvedValue(member);
      mockPrisma.guardianLink.create.mockResolvedValue({
        id: 'guardian-1',
        fullName: 'Nguyễn Văn A',
        relation: 'father',
        isPrimary: true,
      });

      const result = await service.linkGuardian(
        'org-1',
        'member-1',
        {
          fullName: 'Nguyễn Văn A',
          relation: 'father',
        },
        'actor-1',
      );

      expect(result.fullName).toBe('Nguyễn Văn A');
      expect(mockPrisma.guardianLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orgId: 'org-1',
            orgMemberId: 'member-1',
            fullName: 'Nguyễn Văn A',
            relation: 'father',
            isPrimary: true, // First guardian = auto primary
          }),
        }),
      );
      expect(mockDomainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'hrm.guardian_linked',
        }),
      );
    });

    it('should throw NotFoundException if member not found', async () => {
      mockPrisma.orgMember.findFirst.mockResolvedValue(null);
      await expect(
        service.linkGuardian('org-1', 'bad-id', { fullName: 'X', relation: 'other' }, 'actor-1'),
      ).rejects.toThrow('Member not found');
    });

    it('should demote existing primary when new primary is added', async () => {
      const member = {
        id: 'member-1',
        orgId: 'org-1',
        guardianLinks: [{ id: 'g-1', isPrimary: true }],
      };
      mockPrisma.orgMember.findFirst.mockResolvedValue(member);
      mockPrisma.guardianLink.create.mockResolvedValue({ id: 'g-2', isPrimary: true });
      mockPrisma.guardianLink.updateMany.mockResolvedValue({ count: 1 });

      await service.linkGuardian(
        'org-1',
        'member-1',
        {
          fullName: 'Mẹ B',
          relation: 'mother',
          isPrimary: true,
        },
        'actor-1',
      );

      expect(mockPrisma.guardianLink.updateMany).toHaveBeenCalledWith({
        where: { orgMemberId: 'member-1', isPrimary: true },
        data: { isPrimary: false },
      });
    });
  });

  // ── findByMember ──────────────────────────────────────

  describe('findByMember', () => {
    it('should return guardians ordered by primary first', async () => {
      mockPrisma.guardianLink.findMany.mockResolvedValue([
        { id: 'g-1', isPrimary: true, fullName: 'Primary' },
        { id: 'g-2', isPrimary: false, fullName: 'Secondary' },
      ]);

      const result = await service.findByMember('org-1', 'member-1');
      expect(result).toHaveLength(2);
      expect(result[0]!.isPrimary).toBe(true);
    });
  });

  // ── removeGuardian ────────────────────────────────────

  describe('removeGuardian', () => {
    it('should block removal of last guardian for under-18 member', async () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 15); // 15 years old
      mockPrisma.guardianLink.findFirst.mockResolvedValue({
        id: 'g-1',
        orgId: 'org-1',
        orgMemberId: 'member-1',
        fullName: 'Parent',
        orgMember: {
          profile: { birthDate },
          guardianLinks: [{ id: 'g-1' }], // only one guardian
        },
      });

      await expect(service.removeGuardian('org-1', 'g-1', 'actor-1')).rejects.toThrow(
        'Cannot remove the last guardian for a member under 18',
      );
    });

    it('should allow removal for adult members', async () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 25); // 25 years old
      mockPrisma.guardianLink.findFirst.mockResolvedValue({
        id: 'g-1',
        orgId: 'org-1',
        orgMemberId: 'member-1',
        fullName: 'Emergency Contact',
        orgMember: {
          profile: { birthDate },
          guardianLinks: [{ id: 'g-1' }],
        },
      });
      mockPrisma.guardianLink.delete.mockResolvedValue({});

      await expect(service.removeGuardian('org-1', 'g-1', 'actor-1')).resolves.toBeUndefined();
    });
  });

  // ── validateGuardianCompliance ────────────────────────

  describe('validateGuardianCompliance', () => {
    it('should return non-compliant when under-18 has no guardians', async () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 10);
      mockPrisma.orgMember.findFirst.mockResolvedValue({
        id: 'member-1',
        profile: { birthDate },
        guardianLinks: [],
      });

      const result = await service.validateGuardianCompliance('org-1', 'member-1');
      expect(result.compliant).toBe(false);
      expect(result.reason).toContain('at least one guardian');
    });

    it('should return compliant for adult without guardians', async () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 20);
      mockPrisma.orgMember.findFirst.mockResolvedValue({
        id: 'member-1',
        profile: { birthDate },
        guardianLinks: [],
      });

      const result = await service.validateGuardianCompliance('org-1', 'member-1');
      expect(result.compliant).toBe(true);
    });
  });
});
