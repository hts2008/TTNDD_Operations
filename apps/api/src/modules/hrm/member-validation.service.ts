import { Injectable, BadRequestException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../core/database';

/**
 * T-0043: Age→Branch validation
 * T-0044: Under-age guardian rule
 * T-0045: Compliance flags validation
 *
 * Branch age ranges (DTNDD standard):
 *   Ấu     (Cub)      : 7-11
 *   Thiếu  (Scout)    : 12-15
 *   Kha    (Venture)  : 16-17
 *   Tráng  (Rover)    : 18-25
 *   Trưởng (Leader)   : 18+
 */

const BRANCH_AGE_RANGES: Record<string, { min: number; max: number }> = {
  au: { min: 7, max: 11 },
  thieu: { min: 12, max: 15 },
  kha: { min: 16, max: 17 },
  trang: { min: 18, max: 25 },
  truong: { min: 18, max: 99 },
};

export interface ComplianceResult {
  compliant: boolean;
  violations: string[];
}

@Injectable()
export class MemberValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * T-0043: Validate that member's age fits the target branch.
   */
  validateAgeBranch(
    birthDate: Date | null | undefined,
    branchCode: string | null | undefined,
  ): { valid: boolean; reason?: string } {
    if (!birthDate || !branchCode) {
      return { valid: true }; // Cannot validate without data
    }

    const age = this.calculateAge(birthDate);
    const normalizedCode = branchCode.toLowerCase().replace(/[^a-z]/g, '');
    const range = BRANCH_AGE_RANGES[normalizedCode];

    if (!range) {
      return { valid: true }; // Unknown branch code, skip validation
    }

    if (age < range.min || age > range.max) {
      return {
        valid: false,
        reason: `Member age ${age} is outside range for branch "${branchCode}" (${range.min}-${range.max})`,
      };
    }

    return { valid: true };
  }

  /**
   * T-0044: Check if member requires a guardian (under 18).
   */
  requiresGuardian(birthDate: Date | null | undefined): boolean {
    if (!birthDate) return true; // Default: require guardian when age unknown
    return this.calculateAge(birthDate) < 18;
  }

  /**
   * T-0045: Full compliance check for a member.
   * Returns list of all violations.
   */
  async checkCompliance(
    orgId: string,
    memberId: string,
    db: PrismaClient = this.prisma,
  ): Promise<ComplianceResult> {
    const member = await db.orgMember.findFirst({
      where: { id: memberId, orgId },
      include: {
        profile: true,
        guardianLinks: { select: { id: true, consentSigned: true } },
        branch: { select: { code: true } },
      },
    });

    if (!member) throw new BadRequestException('Member not found');

    const violations: string[] = [];

    // Profile completeness
    if (!member.profile) {
      violations.push('MISSING_PROFILE: Member profile not created');
      return { compliant: false, violations };
    }

    if (!member.profile.fullName) violations.push('MISSING_NAME: Full name is required');
    if (!member.profile.birthDate) violations.push('MISSING_BIRTHDATE: Birth date is required');
    if (!member.profile.emergencyContact)
      violations.push('MISSING_EMERGENCY: Emergency contact is required');

    // T-0043: Age→Branch validation
    const ageBranch = this.validateAgeBranch(member.profile.birthDate, member.branch?.code);
    if (!ageBranch.valid) {
      violations.push(`AGE_BRANCH_MISMATCH: ${ageBranch.reason}`);
    }

    // T-0044: Under-age guardian rule
    if (member.profile.birthDate && this.requiresGuardian(member.profile.birthDate)) {
      if (member.guardianLinks.length === 0) {
        violations.push('MISSING_GUARDIAN: Member under 18 must have at least one guardian');
      } else if (!member.guardianLinks.some((g) => g.consentSigned)) {
        violations.push('MISSING_CONSENT: At least one guardian must have signed consent');
      }
    }

    // T-0045: Compliance dates
    const now = new Date();
    if (
      member.profile.backgroundCheckExpiry &&
      new Date(member.profile.backgroundCheckExpiry) < now
    ) {
      violations.push('EXPIRED_BACKGROUND_CHECK: Background check has expired');
    }
    if (!member.profile.medicalFormDate) {
      violations.push('MISSING_MEDICAL: Medical form not submitted');
    }

    return { compliant: violations.length === 0, violations };
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }
}
