import { MemberValidationService } from './member-validation.service';

const mockPrisma = {
  orgMember: { findFirst: jest.fn() },
};

describe('MemberValidationService', () => {
  let service: MemberValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MemberValidationService(mockPrisma as any);
  });

  // ── validateAgeBranch (T-0043) ────────────────────────

  describe('validateAgeBranch', () => {
    it('should accept 10-year-old for "au" branch', () => {
      const birth = new Date();
      birth.setFullYear(birth.getFullYear() - 10);
      const result = service.validateAgeBranch(birth, 'au');
      expect(result.valid).toBe(true);
    });

    it('should reject 16-year-old for "au" branch', () => {
      const birth = new Date();
      birth.setFullYear(birth.getFullYear() - 16);
      const result = service.validateAgeBranch(birth, 'au');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('outside range');
    });

    it('should accept 13-year-old for "thieu" branch', () => {
      const birth = new Date();
      birth.setFullYear(birth.getFullYear() - 13);
      const result = service.validateAgeBranch(birth, 'thieu');
      expect(result.valid).toBe(true);
    });

    it('should accept 20-year-old for "truong" branch', () => {
      const birth = new Date();
      birth.setFullYear(birth.getFullYear() - 20);
      const result = service.validateAgeBranch(birth, 'truong');
      expect(result.valid).toBe(true);
    });

    it('should skip validation when birthDate is null', () => {
      const result = service.validateAgeBranch(null, 'au');
      expect(result.valid).toBe(true);
    });
  });

  // ── requiresGuardian (T-0044) ─────────────────────────

  describe('requiresGuardian', () => {
    it('should require guardian for 15-year-old', () => {
      const birth = new Date();
      birth.setFullYear(birth.getFullYear() - 15);
      expect(service.requiresGuardian(birth)).toBe(true);
    });

    it('should not require guardian for 18-year-old', () => {
      const birth = new Date();
      birth.setFullYear(birth.getFullYear() - 18);
      expect(service.requiresGuardian(birth)).toBe(false);
    });

    it('should require guardian when birthDate is null (safe default)', () => {
      expect(service.requiresGuardian(null)).toBe(true);
    });
  });

  // ── checkCompliance (T-0045) ──────────────────────────

  describe('checkCompliance', () => {
    it('should return violations for incomplete underage member', async () => {
      const birth = new Date();
      birth.setFullYear(birth.getFullYear() - 12);
      mockPrisma.orgMember.findFirst.mockResolvedValue({
        id: 'member-1',
        profile: {
          fullName: 'Test',
          birthDate: birth,
          emergencyContact: null,
          backgroundCheckExpiry: null,
          medicalFormDate: null,
        },
        guardianLinks: [],
        branch: { code: 'thieu' },
      });

      const result = await service.checkCompliance('org-1', 'member-1');
      expect(result.compliant).toBe(false);
      expect(result.violations).toContain('MISSING_EMERGENCY: Emergency contact is required');
      expect(result.violations).toContain(
        'MISSING_GUARDIAN: Member under 18 must have at least one guardian',
      );
      expect(result.violations).toContain('MISSING_MEDICAL: Medical form not submitted');
    });

    it('should return compliant for fully-configured adult member', async () => {
      const birth = new Date();
      birth.setFullYear(birth.getFullYear() - 22);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      mockPrisma.orgMember.findFirst.mockResolvedValue({
        id: 'member-1',
        profile: {
          fullName: 'Trưởng ABC',
          birthDate: birth,
          emergencyContact: '0901234567',
          backgroundCheckExpiry: futureDate,
          medicalFormDate: new Date(),
        },
        guardianLinks: [],
        branch: { code: 'truong' },
      });

      const result = await service.checkCompliance('org-1', 'member-1');
      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });
});
