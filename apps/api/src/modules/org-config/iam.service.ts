import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import {
  OrgRole,
  OrgRoleType,
  ROLE_HIERARCHY,
  isHigherRole,
  hasPermission,
  Permission,
} from './roles.constants';

/**
 * T-0022: IAM Service — Member invite, role management, lifecycle
 *
 * Handles user/org_member operations:
 * - Invite member (create user if needed + create OrgMember)
 * - Update role (with escalation guard)
 * - Reassign branch/unit
 * - Deactivate / Reactivate / Remove
 */
@Injectable()
export class IamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── Invite Member ──────────────────────────────────────

  async inviteMember(
    orgId: string,
    data: {
      email: string;
      displayName?: string;
      role: string;
      branchId?: string;
      unitId?: string;
    },
    actorUserId: string,
    actorRole: string,
  ) {
    // Validate role
    if (!ROLE_HIERARCHY.includes(data.role as OrgRoleType)) {
      throw new BadRequestException(`Invalid role: ${data.role}`);
    }

    // Escalation guard: actor can only assign roles lower than their own
    if (!isHigherRole(actorRole, data.role)) {
      throw new ForbiddenException(
        `Cannot assign role '${data.role}' — must be lower than your role '${actorRole}'`,
      );
    }

    // Check if user already exists
    let user = await this.prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      // Create user stub (firebaseUid will be set when user first logs in)
      user = await this.prisma.user.create({
        data: {
          email: data.email,
          displayName: data.displayName ?? data.email.split('@')[0],
          firebaseUid: `pending:${data.email}`, // placeholder until Firebase signup
          isActive: true,
        },
      });
    }

    // Check for existing membership in this org
    const existing = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: user.id } },
    });
    if (existing) {
      if (existing.status === 'active') {
        throw new ConflictException('User is already an active member of this organization');
      }
      // Reactivate if previously deactivated/left
      const reactivated = await this.prisma.orgMember.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          role: data.role,
          branchId: data.branchId ?? existing.branchId,
          unitId: data.unitId ?? existing.unitId,
        },
      });
      await this.audit.log({
        orgId,
        userId: actorUserId,
        action: 'member.reactivated_via_invite',
        resource: 'OrgMember',
        resourceId: reactivated.id,
        newValue: { role: data.role, email: data.email } as unknown as Prisma.InputJsonValue,
      });
      return reactivated;
    }

    // Create new OrgMember
    const member = await this.prisma.orgMember.create({
      data: {
        orgId,
        userId: user.id,
        role: data.role,
        branchId: data.branchId,
        unitId: data.unitId,
        status: 'active',
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'member.invited',
      resource: 'OrgMember',
      resourceId: member.id,
      newValue: { email: data.email, role: data.role } as unknown as Prisma.InputJsonValue,
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.ORG.MEMBER_JOINED,
      aggregateId: member.id,
      aggregateType: 'OrgMember',
      payload: {
        userId: user.id,
        email: data.email,
        role: data.role,
      } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return member;
  }

  // ── Update Role ────────────────────────────────────────

  async updateMemberRole(
    orgId: string,
    memberId: string,
    newRole: string,
    actorUserId: string,
    actorRole: string,
  ) {
    if (!ROLE_HIERARCHY.includes(newRole as OrgRoleType)) {
      throw new BadRequestException(`Invalid role: ${newRole}`);
    }

    const member = await this.findMemberOrThrow(orgId, memberId);

    // Escalation guard
    if (!isHigherRole(actorRole, newRole)) {
      throw new ForbiddenException(
        `Cannot assign role '${newRole}' — must be lower than your role '${actorRole}'`,
      );
    }
    if (!isHigherRole(actorRole, member.role)) {
      throw new ForbiddenException(
        `Cannot modify a member with role '${member.role}' — must have higher role`,
      );
    }

    const oldRole = member.role;
    const updated = await this.prisma.orgMember.update({
      where: { id: memberId },
      data: { role: newRole },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'member.role_changed',
      resource: 'OrgMember',
      resourceId: memberId,
      oldValue: { role: oldRole } as unknown as Prisma.InputJsonValue,
      newValue: { role: newRole } as unknown as Prisma.InputJsonValue,
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.ORG.MEMBER_ROLE_CHANGED,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: { oldRole, newRole } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return updated;
  }

  // ── Reassign Branch/Unit ───────────────────────────────

  async updateMemberAssignment(
    orgId: string,
    memberId: string,
    data: { branchId?: string; unitId?: string },
    actorUserId: string,
  ) {
    const member = await this.findMemberOrThrow(orgId, memberId);
    const oldAssignment = { branchId: member.branchId, unitId: member.unitId };

    const updated = await this.prisma.orgMember.update({
      where: { id: memberId },
      data: {
        branchId: data.branchId ?? member.branchId,
        unitId: data.unitId ?? member.unitId,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'member.reassigned',
      resource: 'OrgMember',
      resourceId: memberId,
      oldValue: oldAssignment as unknown as Prisma.InputJsonValue,
      newValue: data as Prisma.InputJsonValue,
    });

    return updated;
  }

  // ── Deactivate ─────────────────────────────────────────

  async deactivateMember(orgId: string, memberId: string, actorUserId: string, actorRole: string) {
    const member = await this.findMemberOrThrow(orgId, memberId);

    if (member.status !== 'active') {
      throw new BadRequestException(`Member is already '${member.status}'`);
    }
    if (!isHigherRole(actorRole, member.role)) {
      throw new ForbiddenException('Cannot deactivate a member with equal or higher role');
    }

    const updated = await this.prisma.orgMember.update({
      where: { id: memberId },
      data: { status: 'inactive' },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'member.deactivated',
      resource: 'OrgMember',
      resourceId: memberId,
    });

    return updated;
  }

  // ── Reactivate ─────────────────────────────────────────

  async reactivateMember(orgId: string, memberId: string, actorUserId: string) {
    const member = await this.findMemberOrThrow(orgId, memberId);

    if (member.status === 'active') {
      throw new BadRequestException('Member is already active');
    }

    const updated = await this.prisma.orgMember.update({
      where: { id: memberId },
      data: { status: 'active' },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'member.reactivated',
      resource: 'OrgMember',
      resourceId: memberId,
    });

    return updated;
  }

  // ── Remove (soft-delete: status=left) ──────────────────

  async removeMember(orgId: string, memberId: string, actorUserId: string, actorRole: string) {
    const member = await this.findMemberOrThrow(orgId, memberId);

    if (!isHigherRole(actorRole, member.role)) {
      throw new ForbiddenException('Cannot remove a member with equal or higher role');
    }

    const updated = await this.prisma.orgMember.update({
      where: { id: memberId },
      data: { status: 'left' },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'member.removed',
      resource: 'OrgMember',
      resourceId: memberId,
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.ORG.MEMBER_LEFT,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: { userId: member.userId } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return updated;
  }

  // ── Get available roles ────────────────────────────────

  getRoles() {
    return ROLE_HIERARCHY.map((role) => ({
      value: role,
      label: role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }

  // ── Helpers ────────────────────────────────────────────

  private async findMemberOrThrow(orgId: string, memberId: string) {
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, orgId },
    });
    if (!member) throw new NotFoundException(`Member '${memberId}' not found in this organization`);
    return member;
  }
}
