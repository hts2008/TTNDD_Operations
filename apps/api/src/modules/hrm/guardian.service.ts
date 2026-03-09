import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';

export interface CreateGuardianDto {
  fullName: string;
  relation: string;
  phone?: string;
  email?: string;
  zaloId?: string;
  address?: string;
  idCard?: string;
  isPrimary?: boolean;
  canPickup?: boolean;
  consentSigned?: boolean;
  consentDate?: string;
  notes?: string;
}

export type UpdateGuardianDto = Partial<CreateGuardianDto>;

/**
 * Guardian Link Service — manages guardian/parent relationships for members.
 *
 * Key rules:
 * - Members under 18 MUST have at least one guardian (T-0044)
 * - Each member can have multiple guardians; exactly one should be isPrimary
 * - org_id scoping on all queries
 */
@Injectable()
export class GuardianService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Link a guardian to a member.
   */
  async linkGuardian(orgId: string, memberId: string, dto: CreateGuardianDto, actorUserId: string) {
    // Verify member exists in this org
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, orgId },
      include: { guardianLinks: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    // If this is the first guardian or isPrimary requested, ensure only one primary
    const isPrimary = dto.isPrimary ?? member.guardianLinks.length === 0;

    if (isPrimary && member.guardianLinks.some((g) => g.isPrimary)) {
      // Demote existing primary
      await this.prisma.guardianLink.updateMany({
        where: { orgMemberId: memberId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const guardian = await this.prisma.guardianLink.create({
      data: {
        orgId,
        orgMemberId: memberId,
        fullName: dto.fullName,
        relation: dto.relation,
        phone: dto.phone,
        email: dto.email,
        zaloId: dto.zaloId,
        address: dto.address,
        idCard: dto.idCard,
        isPrimary,
        canPickup: dto.canPickup ?? true,
        consentSigned: dto.consentSigned ?? false,
        consentDate: dto.consentDate ? new Date(dto.consentDate) : undefined,
        notes: dto.notes,
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.HRM.GUARDIAN_LINKED,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: { guardianId: guardian.id, fullName: dto.fullName, relation: dto.relation },
      actorUserId,
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'hrm.guardian_linked',
      resource: 'GuardianLink',
      resourceId: guardian.id,
      newValue: { fullName: dto.fullName, relation: dto.relation, isPrimary },
    });

    return guardian;
  }

  /**
   * List guardians for a member.
   */
  async findByMember(orgId: string, memberId: string) {
    return this.prisma.guardianLink.findMany({
      where: { orgId, orgMemberId: memberId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Update a guardian link.
   */
  async updateGuardian(
    orgId: string,
    guardianId: string,
    dto: UpdateGuardianDto,
    actorUserId: string,
  ) {
    const existing = await this.prisma.guardianLink.findFirst({
      where: { id: guardianId, orgId },
    });
    if (!existing) throw new NotFoundException('Guardian link not found');

    // If promoting to primary, demote others
    if (dto.isPrimary && !existing.isPrimary) {
      await this.prisma.guardianLink.updateMany({
        where: { orgMemberId: existing.orgMemberId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const updated = await this.prisma.guardianLink.update({
      where: { id: guardianId },
      data: {
        fullName: dto.fullName,
        relation: dto.relation,
        phone: dto.phone,
        email: dto.email,
        zaloId: dto.zaloId,
        address: dto.address,
        idCard: dto.idCard,
        isPrimary: dto.isPrimary,
        canPickup: dto.canPickup,
        consentSigned: dto.consentSigned,
        consentDate: dto.consentDate ? new Date(dto.consentDate) : undefined,
        notes: dto.notes,
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.HRM.GUARDIAN_UPDATED,
      aggregateId: existing.orgMemberId,
      aggregateType: 'OrgMember',
      payload: { guardianId, changes: dto },
      actorUserId,
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'hrm.guardian_updated',
      resource: 'GuardianLink',
      resourceId: guardianId,
      oldValue: { fullName: existing.fullName, relation: existing.relation },
      newValue: dto as any,
    });

    return updated;
  }

  /**
   * Remove a guardian link.
   * T-0044: Blocks removal if member is under 18 and this is their only guardian.
   */
  async removeGuardian(orgId: string, guardianId: string, actorUserId: string) {
    const existing = await this.prisma.guardianLink.findFirst({
      where: { id: guardianId, orgId },
      include: {
        orgMember: {
          include: {
            profile: { select: { birthDate: true } },
            guardianLinks: { select: { id: true } },
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('Guardian link not found');

    // T-0044: Under-age guardian rule
    const memberAge = this.calculateAge(existing.orgMember?.profile?.birthDate);
    const guardianCount = existing.orgMember?.guardianLinks?.length ?? 0;

    if (memberAge !== null && memberAge < 18 && guardianCount <= 1) {
      throw new BadRequestException(
        'Cannot remove the last guardian for a member under 18 years old',
      );
    }

    await this.prisma.guardianLink.delete({ where: { id: guardianId } });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.HRM.GUARDIAN_REMOVED,
      aggregateId: existing.orgMemberId,
      aggregateType: 'OrgMember',
      payload: { guardianId, fullName: existing.fullName },
      actorUserId,
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'hrm.guardian_removed',
      resource: 'GuardianLink',
      resourceId: guardianId,
      oldValue: { fullName: existing.fullName, relation: existing.relation },
    });
  }

  /**
   * T-0044: Check compliance — member under 18 must have at least one guardian.
   */
  async validateGuardianCompliance(
    orgId: string,
    memberId: string,
  ): Promise<{ compliant: boolean; reason?: string }> {
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, orgId },
      include: {
        profile: { select: { birthDate: true } },
        guardianLinks: { select: { id: true, consentSigned: true } },
      },
    });

    if (!member) throw new NotFoundException('Member not found');

    const age = this.calculateAge(member.profile?.birthDate);

    if (age === null) {
      return { compliant: false, reason: 'Birth date not set — cannot determine age' };
    }

    if (age < 18) {
      if (member.guardianLinks.length === 0) {
        return { compliant: false, reason: 'Member under 18 must have at least one guardian' };
      }
      const hasConsent = member.guardianLinks.some((g) => g.consentSigned);
      if (!hasConsent) {
        return { compliant: false, reason: 'At least one guardian must have signed consent' };
      }
    }

    return { compliant: true };
  }

  /**
   * Calculate age from birthDate. Returns null if no birthDate.
   */
  private calculateAge(birthDate: Date | null | undefined): number | null {
    if (!birthDate) return null;
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
