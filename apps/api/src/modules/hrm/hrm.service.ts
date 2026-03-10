import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import { MemberLifecycleService } from './member-lifecycle.service';
import { MemberValidationService } from './member-validation.service';

interface CreateMemberDto {
  userId: string;
  role: string;
  branchId?: string;
  unitId?: string;
  memberCode?: string;
  scoutName?: string;
  heroName?: string;
  profile: {
    fullName: string;
    birthDate?: string;
    gender?: string;
    address?: string;
    personalPhone?: string;
    personalEmail?: string;
    guardianName?: string;
    guardianPhone?: string;
    guardianRelation?: string;
    healthNotes?: string;
    emergencyContact?: string;
  };
}

interface TransferMemberDto {
  toBranchId: string;
  toUnitId?: string;
  reason?: string;
  triggerType?: 'manual' | 'age_threshold' | 'admin';
}

interface OnboardingTemplateDto {
  name: string;
  roleType: string;
  items: Array<{ key: string; label: string; required: boolean; order: number }>;
}

interface TrainingRecordDto {
  trainingType: string;
  trainingName: string;
  completedAt: string;
  expiresAt?: string;
  certificateUrl?: string;
  notes?: string;
}

@Injectable()
export class HrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
    private readonly lifecycle: MemberLifecycleService,
    private readonly validation: MemberValidationService,
  ) {}

  async createMember(orgId: string, dto: CreateMemberDto, actorUserId: string) {
    // T-0043: Age→Branch validation
    if (dto.profile.birthDate && dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
        select: { code: true },
      });
      const ageBranch = this.validation.validateAgeBranch(
        new Date(dto.profile.birthDate),
        branch?.code,
      );
      if (!ageBranch.valid) {
        throw new BadRequestException(ageBranch.reason);
      }
    }

    const member = await this.prisma.orgMember.create({
      data: {
        orgId,
        userId: dto.userId,
        role: dto.role,
        branchId: dto.branchId,
        unitId: dto.unitId,
        memberCode: dto.memberCode,
        scoutName: dto.scoutName,
        heroName: dto.heroName,
        status: 'pending',
        profile: {
          create: {
            orgId,
            fullName: dto.profile.fullName,
            birthDate: dto.profile.birthDate ? new Date(dto.profile.birthDate) : undefined,
            gender: dto.profile.gender,
            address: dto.profile.address,
            personalPhone: dto.profile.personalPhone,
            personalEmail: dto.profile.personalEmail,
            guardianName: dto.profile.guardianName,
            guardianPhone: dto.profile.guardianPhone,
            guardianRelation: dto.profile.guardianRelation,
            healthNotes: dto.profile.healthNotes,
            emergencyContact: dto.profile.emergencyContact,
            createdBy: actorUserId,
          },
        },
      },
      include: { profile: true, user: { select: { displayName: true, email: true } } },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.HRM.MEMBER_CREATED,
      aggregateId: member.id,
      aggregateType: 'OrgMember',
      payload: { memberId: member.id, role: dto.role, status: 'pending' },
      actorUserId,
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'hrm.member_created',
      resource: 'OrgMember',
      resourceId: member.id,
      newValue: { role: dto.role, fullName: dto.profile.fullName },
    });

    return member;
  }

  async findMany(
    orgId: string,
    filters?: { status?: string; branchId?: string; role?: string; search?: string },
    page = 1,
    limit = 20,
  ) {
    const where: Prisma.OrgMemberWhereInput = { orgId };
    if (filters?.status) where.status = filters.status;
    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.role) where.role = filters.role;
    if (filters?.search) {
      where.OR = [
        { scoutName: { contains: filters.search, mode: 'insensitive' } },
        { memberCode: { contains: filters.search, mode: 'insensitive' } },
        { user: { displayName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.orgMember.findMany({
        where,
        include: {
          user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
          branch: { select: { id: true, name: true, code: true } },
          unit: { select: { id: true, name: true } },
          profile: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.orgMember.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findById(orgId: string, memberId: string) {
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, orgId },
      include: {
        user: {
          select: { id: true, displayName: true, email: true, avatarUrl: true, phone: true },
        },
        branch: true,
        unit: true,
        profile: true,
        guardianLinks: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        branchHistory: { orderBy: { transitionDate: 'desc' } },
      },
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async updateProfile(
    orgId: string,
    memberId: string,
    data: Partial<CreateMemberDto['profile']>,
    actorUserId: string,
  ) {
    const member = await this.findById(orgId, memberId);
    if (!member.profile) throw new NotFoundException('Member profile not found');

    const updateData: Prisma.MemberProfileUpdateInput = {};
    if (data.fullName) updateData.fullName = data.fullName;
    if (data.birthDate) updateData.birthDate = new Date(data.birthDate);
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.personalPhone !== undefined) updateData.personalPhone = data.personalPhone;
    if (data.personalEmail !== undefined) updateData.personalEmail = data.personalEmail;
    if (data.guardianName !== undefined) updateData.guardianName = data.guardianName;
    if (data.guardianPhone !== undefined) updateData.guardianPhone = data.guardianPhone;
    if (data.guardianRelation !== undefined) updateData.guardianRelation = data.guardianRelation;
    if (data.healthNotes !== undefined) updateData.healthNotes = data.healthNotes;
    if (data.emergencyContact !== undefined) updateData.emergencyContact = data.emergencyContact;

    const updated = await this.prisma.memberProfile.update({
      where: { orgMemberId: memberId },
      data: updateData,
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'hrm.profile_updated',
      resource: 'MemberProfile',
      resourceId: member.profile.id,
      newValue: data as Prisma.InputJsonValue,
    });

    return updated;
  }

  async transitionStatus(orgId: string, memberId: string, action: string, actorUserId: string) {
    const member = await this.findById(orgId, memberId);
    const newStatus = this.lifecycle.transition(member.status, action);

    const updated = await this.prisma.orgMember.update({
      where: { id: memberId },
      data: { status: newStatus },
    });

    const eventMap: Record<string, string> = {
      active: DOMAIN_EVENTS.HRM.MEMBER_ACTIVATED,
      suspended: DOMAIN_EVENTS.HRM.MEMBER_SUSPENDED,
      left: DOMAIN_EVENTS.HRM.MEMBER_LEFT,
    };
    const eventType = eventMap[newStatus] || DOMAIN_EVENTS.HRM.MEMBER_ACTIVATED;

    await this.domainEvents.publish({
      orgId,
      eventType,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: { fromStatus: member.status, toStatus: newStatus, action },
      actorUserId,
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: `hrm.member_${action}`,
      resource: 'OrgMember',
      resourceId: memberId,
      oldValue: { status: member.status },
      newValue: { status: newStatus },
    });

    return { ...updated, allowedActions: this.lifecycle.getAllowedActions(newStatus) };
  }

  // ── WP-2.5: T-0061 — Transfer Case Workflow ───────────

  async transferMember(
    orgId: string,
    memberId: string,
    dto: TransferMemberDto,
    actorUserId: string,
  ) {
    const member = await this.findById(orgId, memberId);
    if (member.status !== 'active') {
      throw new BadRequestException('Only active members can be transferred');
    }

    // Build summary snapshot (EXP, rank, attendance)
    const summarySnapshot = await this.buildMemberSummary(orgId, memberId);

    // Create TransferCase instead of directly changing status
    const transferCase = await this.prisma.transferCase.create({
      data: {
        orgId,
        orgMemberId: memberId,
        fromBranchId: member.branchId ?? '',
        toBranchId: dto.toBranchId,
        fromUnitId: member.unitId,
        toUnitId: dto.toUnitId,
        status: 'initiated',
        reason: dto.reason,
        triggerType: dto.triggerType ?? 'manual',
        summarySnapshot,
        initiatedBy: actorUserId,
      },
    });

    // T-0064: Publish domain event
    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.HRM.MEMBER_TRANSFERRED,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: {
        transferCaseId: transferCase.id,
        fromBranch: member.branchId,
        toBranch: dto.toBranchId,
        reason: dto.reason,
        triggerType: dto.triggerType ?? 'manual',
      },
      actorUserId,
    });

    return transferCase;
  }

  async getTransferCases(orgId: string, filters?: { status?: string; memberId?: string }) {
    return this.prisma.transferCase.findMany({
      where: {
        orgId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.memberId && { orgMemberId: filters.memberId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransferCase(orgId: string, caseId: string) {
    const tc = await this.prisma.transferCase.findFirst({ where: { id: caseId, orgId } });
    if (!tc) throw new NotFoundException('Transfer case not found');
    return tc;
  }

  async approveTransfer(orgId: string, caseId: string, actorUserId: string) {
    const tc = await this.getTransferCase(orgId, caseId);
    if (tc.status !== 'initiated') {
      throw new BadRequestException(`Cannot approve case in status: ${tc.status}`);
    }
    return this.prisma.transferCase.update({
      where: { id: caseId },
      data: { status: 'pending_handover', approvedBy: actorUserId },
    });
  }

  // T-0064: Complete handover — attach note + move to handover_complete
  async completeHandover(orgId: string, caseId: string, note: string, actorUserId: string) {
    const tc = await this.getTransferCase(orgId, caseId);
    if (tc.status !== 'pending_handover') {
      throw new BadRequestException(`Cannot complete handover in status: ${tc.status}`);
    }
    return this.prisma.transferCase.update({
      where: { id: caseId },
      data: { status: 'handover_complete', handoverNote: note },
    });
  }

  // T-0065: Accept transfer — execute the actual branch move + close case
  async acceptTransfer(orgId: string, caseId: string, actorUserId: string) {
    const tc = await this.getTransferCase(orgId, caseId);
    if (tc.status !== 'handover_complete') {
      throw new BadRequestException(`Cannot accept transfer in status: ${tc.status}`);
    }

    // Execute the actual member move in a transaction
    const [updatedCase] = await this.prisma.$transaction([
      this.prisma.transferCase.update({
        where: { id: caseId },
        data: { status: 'closed', completedAt: new Date() },
      }),
      this.prisma.orgMember.update({
        where: { id: tc.orgMemberId },
        data: { branchId: tc.toBranchId, unitId: tc.toUnitId, status: 'active' },
      }),
      this.prisma.memberBranchHistory.create({
        data: {
          orgId,
          orgMemberId: tc.orgMemberId,
          fromBranchId: tc.fromBranchId,
          toBranchId: tc.toBranchId,
          fromUnitId: tc.fromUnitId,
          toUnitId: tc.toUnitId,
          transitionDate: new Date(),
          reason: tc.reason,
          approvedBy: actorUserId,
        },
      }),
    ]);

    return updatedCase;
  }

  async cancelTransfer(orgId: string, caseId: string, actorUserId: string) {
    const tc = await this.getTransferCase(orgId, caseId);
    if (['closed', 'cancelled'].includes(tc.status)) {
      throw new BadRequestException(`Cannot cancel case in status: ${tc.status}`);
    }
    return this.prisma.transferCase.update({
      where: { id: caseId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });
  }

  private async buildMemberSummary(orgId: string, memberId: string) {
    const [expSummary, ranks, badges] = await Promise.all([
      this.prisma.memberExpSummary.findUnique({ where: { orgMemberId: memberId } }),
      this.prisma.memberRank.findMany({
        where: { orgMemberId: memberId },
        orderBy: { completedAt: 'desc' },
        take: 1,
      }),
      this.prisma.memberBadge.findMany({ where: { orgMemberId: memberId } }),
    ]);
    return {
      totalExp: expSummary?.totalExp ?? 0,
      currentRank: ranks[0]?.rankId ?? null,
      badgeCount: badges.length,
      snapshotDate: new Date().toISOString(),
    };
  }

  async getOrgChart(orgId: string) {
    const nodes = await this.prisma.orgChartNode.findMany({
      where: { orgId, isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        headMember: {
          select: {
            id: true,
            role: true,
            scoutName: true,
            heroName: true,
            user: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    // Build tree from flat list
    const nodeMap = new Map<string, (typeof nodes)[0] & { children: typeof nodes }>();
    const roots: ((typeof nodes)[0] & { children: typeof nodes })[] = [];
    for (const n of nodes) {
      nodeMap.set(n.id, { ...n, children: [] });
    }
    for (const n of nodes) {
      const item = nodeMap.get(n.id)!;
      if (n.parentNodeId && nodeMap.has(n.parentNodeId)) {
        nodeMap.get(n.parentNodeId)!.children.push(item);
      } else {
        roots.push(item);
      }
    }
    return roots;
  }

  async createOrgChartNode(
    orgId: string,
    data: {
      name: string;
      nodeType: string;
      parentNodeId?: string;
      orgMemberId?: string;
      positionTitle?: string;
      displayOrder?: number;
      validFrom?: string;
      validTo?: string;
    },
    actorUserId: string,
  ) {
    // Validate parent belongs to same org
    if (data.parentNodeId) {
      const parent = await this.prisma.orgChartNode.findFirst({
        where: { id: data.parentNodeId, orgId },
      });
      if (!parent) throw new NotFoundException('Parent node not found in this org');
    }

    const node = await this.prisma.orgChartNode.create({
      data: {
        orgId,
        name: data.name,
        nodeType: data.nodeType,
        parentNodeId: data.parentNodeId ?? null,
        orgMemberId: data.orgMemberId ?? null,
        positionTitle: data.positionTitle ?? null,
        displayOrder: data.displayOrder ?? 0,
        validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
        validTo: data.validTo ? new Date(data.validTo) : null,
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.HRM.ORG_NODE_CREATED ?? 'hrm.org_node_created',
      aggregateType: 'OrgChartNode',
      aggregateId: node.id,
      actorUserId: actorUserId,
      payload: { name: data.name, nodeType: data.nodeType, parentNodeId: data.parentNodeId },
    });

    return node;
  }

  async updateOrgChartNode(
    orgId: string,
    nodeId: string,
    data: {
      name?: string;
      nodeType?: string;
      parentNodeId?: string | null;
      orgMemberId?: string | null;
      positionTitle?: string | null;
      displayOrder?: number;
      isActive?: boolean;
      validTo?: string | null;
    },
    actorUserId: string,
  ) {
    const existing = await this.prisma.orgChartNode.findFirst({
      where: { id: nodeId, orgId },
    });
    if (!existing) throw new NotFoundException('Org chart node not found');

    // Prevent circular: cannot set parent to self or own descendant
    if (data.parentNodeId && data.parentNodeId === nodeId) {
      throw new BadRequestException('Cannot set node as its own parent');
    }

    const updated = await this.prisma.orgChartNode.update({
      where: { id: nodeId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.nodeType !== undefined && { nodeType: data.nodeType }),
        ...(data.parentNodeId !== undefined && { parentNodeId: data.parentNodeId }),
        ...(data.orgMemberId !== undefined && { orgMemberId: data.orgMemberId }),
        ...(data.positionTitle !== undefined && { positionTitle: data.positionTitle }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.validTo !== undefined && {
          validTo: data.validTo ? new Date(data.validTo) : null,
        }),
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.HRM.ORG_NODE_UPDATED ?? 'hrm.org_node_updated',
      aggregateType: 'OrgChartNode',
      aggregateId: nodeId,
      actorUserId: actorUserId,
      payload: data,
    });

    return updated;
  }

  async deleteOrgChartNode(orgId: string, nodeId: string, actorUserId: string) {
    const existing = await this.prisma.orgChartNode.findFirst({
      where: { id: nodeId, orgId },
      include: { childNodes: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException('Org chart node not found');

    if (existing.childNodes.length > 0) {
      throw new BadRequestException(
        `Cannot delete node with ${existing.childNodes.length} child node(s). Reassign or delete children first.`,
      );
    }

    await this.prisma.orgChartNode.delete({ where: { id: nodeId } });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.HRM.ORG_NODE_DELETED ?? 'hrm.org_node_deleted',
      aggregateType: 'OrgChartNode',
      aggregateId: nodeId,
      actorUserId: actorUserId,
      payload: { name: existing.name, nodeType: existing.nodeType },
    });

    return { deleted: true, id: nodeId };
  }

  // T-0052: Batch reorder nodes (drag/drop)
  async reorderOrgChartNodes(
    orgId: string,
    items: Array<{ id: string; displayOrder: number }>,
    actorUserId: string,
  ) {
    // Verify all nodes belong to this org
    const nodeIds = items.map((i) => i.id);
    const existing = await this.prisma.orgChartNode.findMany({
      where: { id: { in: nodeIds }, orgId },
      select: { id: true },
    });
    if (existing.length !== nodeIds.length) {
      throw new BadRequestException('Some nodes not found or belong to a different org');
    }

    // Batch update displayOrder in transaction
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.orgChartNode.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.HRM.ORG_NODE_UPDATED ?? 'hrm.org_node_updated',
      aggregateType: 'OrgChartNode',
      aggregateId: orgId,
      actorUserId: actorUserId,
      payload: { action: 'reorder', count: items.length },
    });

    return { reordered: true, count: items.length };
  }

  // T-0052: Move node to a new parent (drag/drop reparent)
  async reparentOrgChartNode(
    orgId: string,
    nodeId: string,
    newParentId: string | null,
    displayOrder: number,
    actorUserId: string,
  ) {
    const node = await this.prisma.orgChartNode.findFirst({
      where: { id: nodeId, orgId },
    });
    if (!node) throw new NotFoundException('Org chart node not found');

    // Prevent circular reference
    if (newParentId) {
      if (newParentId === nodeId) {
        throw new BadRequestException('Cannot set node as its own parent');
      }
      const parent = await this.prisma.orgChartNode.findFirst({
        where: { id: newParentId, orgId },
      });
      if (!parent) throw new NotFoundException('New parent node not found in this org');

      // Walk up ancestry to detect cycles
      let current = parent;
      while (current.parentNodeId) {
        if (current.parentNodeId === nodeId) {
          throw new BadRequestException('Cannot move node under its own descendant (circular)');
        }
        const ancestor = await this.prisma.orgChartNode.findFirst({
          where: { id: current.parentNodeId, orgId },
        });
        if (!ancestor) break;
        current = ancestor;
      }
    }

    const updated = await this.prisma.orgChartNode.update({
      where: { id: nodeId },
      data: { parentNodeId: newParentId, displayOrder },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.HRM.ORG_NODE_UPDATED ?? 'hrm.org_node_updated',
      aggregateType: 'OrgChartNode',
      aggregateId: nodeId,
      actorUserId: actorUserId,
      payload: { action: 'reparent', newParentId, displayOrder },
    });

    return updated;
  }

  async getTimeline(orgId: string, memberId: string) {
    const [events, history] = await Promise.all([
      this.prisma.domainEvent.findMany({
        where: { orgId, aggregateId: memberId, aggregateType: 'OrgMember' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.memberBranchHistory.findMany({
        where: { orgId, orgMemberId: memberId },
        orderBy: { transitionDate: 'desc' },
      }),
    ]);
    return { events, branchHistory: history };
  }

  async getStats(orgId: string) {
    const [total, byStatus, byBranch, byRole] = await Promise.all([
      this.prisma.orgMember.count({ where: { orgId } }),
      this.prisma.orgMember.groupBy({ by: ['status'], where: { orgId }, _count: true }),
      this.prisma.orgMember.groupBy({ by: ['branchId'], where: { orgId }, _count: true }),
      this.prisma.orgMember.groupBy({ by: ['role'], where: { orgId }, _count: true }),
    ]);
    return { total, byStatus, byBranch, byRole };
  }

  /**
   * T-0048: Cross-module character sheet aggregation.
   * Combines: HRM profile + Rewards (EXP/Badges) + Scout (rank/skills) + attendance stats
   */
  async getCharacterSheet(orgId: string, memberId: string) {
    const [member, expSummary, badges, ranks, attendance] = await Promise.all([
      this.findById(orgId, memberId),
      this.prisma.memberExpSummary.findFirst({ where: { orgMemberId: memberId } }),
      this.prisma.memberBadge.findMany({
        where: { orgMemberId: memberId },
        include: { badge: { select: { name: true, imageUrl: true, badgeType: true } } },
        orderBy: { earnedAt: 'desc' },
        take: 20,
      }),
      this.prisma.memberRank.findMany({
        where: { orgMemberId: memberId },
        orderBy: { completedAt: 'desc' },
        take: 5,
      }),
      this.prisma.sessionAttendance.groupBy({
        by: ['status'],
        where: { orgMemberId: memberId },
        _count: true,
      }),
    ]);

    // T-0050: Compliance check
    const compliance = await this.validation.checkCompliance(orgId, memberId);

    return {
      member,
      rewards: {
        totalExp: expSummary?.totalExp ?? 0,
        availableExp: expSummary?.availableExp ?? 0,
        badges: badges.map((b) => ({
          id: b.id,
          name: b.badge.name,
          imageUrl: b.badge.imageUrl,
          badgeType: b.badge.badgeType,
          earnedAt: b.earnedAt,
        })),
      },
      ranks,
      attendance: attendance.reduce(
        (acc, a) => {
          acc[a.status] = a._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      compliance,
    };
  }

  /**
   * T-0050: Check compliance for a member.
   */
  async checkMemberCompliance(orgId: string, memberId: string) {
    return this.validation.checkCompliance(orgId, memberId);
  }

  // ─── T-0053: Unit Assignment Flows ───────────────────────────
  async assignMemberToUnit(
    orgId: string,
    unitId: string,
    memberId: string,
    roleInUnit?: string,
    actorUserId?: string,
  ) {
    // Verify unit + member belong to same org
    const [unit, member] = await Promise.all([
      this.prisma.unit.findFirst({ where: { id: unitId, orgId } }),
      this.prisma.orgMember.findFirst({ where: { id: memberId, orgId } }),
    ]);
    if (!unit) throw new NotFoundException('Unit not found in this org');
    if (!member) throw new NotFoundException('Member not found in this org');

    const updated = await this.prisma.orgMember.update({
      where: { id: memberId },
      data: {
        unitId,
        ...(roleInUnit && { meta: { ...(member.meta as Record<string, unknown>), roleInUnit } }),
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: 'hrm.member_unit_assigned',
      aggregateType: 'OrgMember',
      aggregateId: memberId,
      actorUserId: actorUserId ?? '',
      payload: { unitId, unitName: unit.name, roleInUnit },
    });

    return updated;
  }

  async removeMemberFromUnit(
    orgId: string,
    unitId: string,
    memberId: string,
    actorUserId?: string,
  ) {
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, orgId, unitId },
    });
    if (!member) throw new NotFoundException('Member not found in this unit');

    const updated = await this.prisma.orgMember.update({
      where: { id: memberId },
      data: { unitId: null },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: 'hrm.member_unit_removed',
      aggregateType: 'OrgMember',
      aggregateId: memberId,
      actorUserId: actorUserId ?? '',
      payload: { unitId },
    });

    return updated;
  }

  async getUnitMembers(orgId: string, unitId: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, orgId },
    });
    if (!unit) throw new NotFoundException('Unit not found in this org');

    const members = await this.prisma.orgMember.findMany({
      where: { orgId, unitId },
      include: {
        user: { select: { displayName: true, avatarUrl: true, email: true } },
        profile: { select: { fullName: true, birthDate: true, gender: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { unit, members, total: members.length };
  }

  // ─── T-0054: Volunteer Availability Calendar ─────────────────
  async setVolunteerAvailability(
    orgId: string,
    userId: string,
    slot: {
      date: string;
      startTime: string;
      endTime: string;
      status: string;
      notes?: string;
    },
  ) {
    // Find the orgMember for this user
    const member = await this.prisma.orgMember.findFirst({
      where: { orgId, userId },
    });
    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.volunteerAvailability.create({
      data: {
        orgId,
        orgMemberId: member.id,
        date: new Date(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
        notes: slot.notes,
      },
    });
  }

  async getVolunteerAvailability(orgId: string, userId: string, from?: string, to?: string) {
    const member = await this.prisma.orgMember.findFirst({
      where: { orgId, userId },
    });
    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.volunteerAvailability.findMany({
      where: {
        orgId,
        orgMemberId: member.id,
        ...(from && { date: { gte: new Date(from) } }),
        ...(to && { date: { lte: new Date(to) } }),
      },
      orderBy: { date: 'asc' },
    });
  }

  async deleteVolunteerAvailability(orgId: string, slotId: string, userId: string) {
    const slot = await this.prisma.volunteerAvailability.findFirst({
      where: { id: slotId, orgId },
    });
    if (!slot) throw new NotFoundException('Availability slot not found');

    await this.prisma.volunteerAvailability.delete({ where: { id: slotId } });
    return { deleted: true, id: slotId };
  }

  // ─── T-0055: Role-Scope Enforcement ──────────────────────────
  async checkRoleScope(orgId: string, userId: string) {
    const member = await this.prisma.orgMember.findFirst({
      where: { orgId, userId },
      include: {
        branch: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
      },
    });
    if (!member) throw new NotFoundException('Member not found');

    const ROLE_SCOPES: Record<string, { level: string; permissions: string[] }> = {
      super_admin: {
        level: 'organization',
        permissions: ['*'],
      },
      admin: {
        level: 'organization',
        permissions: [
          'members.read',
          'members.write',
          'org_chart.read',
          'org_chart.write',
          'units.read',
          'units.write',
          'reports.read',
        ],
      },
      truong: {
        level: 'branch',
        permissions: [
          'members.read',
          'members.write',
          'org_chart.read',
          'units.read',
          'units.write',
          'attendance.write',
          'sessions.write',
        ],
      },
      tnv: {
        level: 'unit',
        permissions: ['members.read', 'attendance.write', 'sessions.read'],
      },
      member: {
        level: 'self',
        permissions: ['profile.read', 'profile.write', 'availability.write'],
      },
      parent: {
        level: 'linked_children',
        permissions: ['profile.read', 'attendance.read', 'progress.read'],
      },
    };

    const scope = ROLE_SCOPES[member.role] ?? ROLE_SCOPES['member']!;

    return {
      userId,
      memberId: member.id,
      role: member.role,
      truongLevel: member.truongLevel,
      scope: {
        level: scope!.level,
        permissions: scope!.permissions,
        branch: member.branch,
        unit: member.unit,
      },
    };
  }

  // ============================================================
  // WP-2.4: PARENT PORTAL & CONSENT READ MODELS (T-0056 → T-0060)
  // ============================================================

  // T-0056: Link parent user account to GuardianLink
  async linkParentAccount(orgId: string, guardianLinkId: string, userId: string) {
    return this.prisma.guardianLink.update({
      where: { id: guardianLinkId, orgId },
      data: { userId },
    });
  }

  // T-0056: Get children linked to a parent user
  async getLinkedChildren(orgId: string, parentUserId: string) {
    const links = await this.prisma.guardianLink.findMany({
      where: { orgId, userId: parentUserId },
      include: {
        orgMember: {
          include: {
            user: { select: { id: true, email: true, displayName: true } },
            profile: { select: { fullName: true, photoUrl: true } },
            branch: { select: { id: true, name: true } },
            unit: { select: { id: true, name: true } },
          },
        },
      },
    });
    return links;
  }

  // T-0057: Parent dashboard read model — aggregated child data
  async getParentDashboard(orgId: string, parentUserId: string) {
    const children = await this.getLinkedChildren(orgId, parentUserId);

    // Log access for each child (T-0058)
    for (const link of children) {
      await this.logChildDataAccess(
        orgId,
        link.orgMemberId,
        parentUserId,
        'parent',
        'view_profile',
        'profile',
      );
    }

    const childIds = children.map((c) => c.orgMemberId);

    // Fetch attendance summary
    const recentAttendance = await this.prisma.sessionAttendance.findMany({
      where: { orgId, orgMemberId: { in: childIds } },
      orderBy: { checkInTime: 'desc' },
      take: 20,
      include: { session: { select: { title: true, sessionDate: true } } },
    });

    // Fetch fee summary
    const fees = await this.prisma.memberFee.findMany({
      where: { orgId, orgMemberId: { in: childIds } },
      orderBy: { dueDate: 'desc' },
      take: 10,
    });

    // Fetch guardian consents
    const consents = children.map((link) => ({
      childId: link.orgMemberId,
      childName: link.orgMember.profile?.fullName ?? link.orgMember.user?.displayName ?? 'Unknown',
      consentSigned: link.consentSigned,
      consentDate: link.consentDate,
      relation: link.relation,
      isPrimary: link.isPrimary,
    }));

    return {
      children: children.map((link) =>
        this.maskChildData(
          {
            id: link.orgMemberId,
            fullName:
              link.orgMember.profile?.fullName ?? link.orgMember.user?.displayName ?? 'Unknown',
            photoUrl: link.orgMember.profile?.photoUrl,
            branch: link.orgMember.branch?.name,
            unit: link.orgMember.unit?.name,
            relation: link.relation,
          },
          'parent',
        ),
      ),
      attendance: recentAttendance.map((a: any) => ({
        childId: a.orgMemberId,
        sessionTitle: a.session?.title,
        sessionDate: a.session?.sessionDate,
        status: a.status,
      })),
      fees: fees.map((f: any) => ({
        childId: f.orgMemberId,
        feeType: f.feeType,
        amount: f.amountDue,
        status: f.status,
        dueDate: f.dueDate,
      })),
      consents,
    };
  }

  // T-0058: Log child data access (COPPA audit trail)
  async logChildDataAccess(
    orgId: string,
    childMemberId: string,
    accessorUserId: string,
    accessorRole: string,
    accessType: string,
    resourceType: string,
    resourceId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.childDataAccessLog.create({
      data: {
        orgId,
        childMemberId,
        accessorUserId,
        accessorRole,
        accessType,
        resourceType,
        resourceId,
        ipAddress,
        userAgent,
      },
    });
  }

  // T-0058: Get child data access logs for transparency
  async getChildDataAccessLogs(orgId: string, childMemberId: string, limit = 50) {
    return this.prisma.childDataAccessLog.findMany({
      where: { orgId, childMemberId },
      orderBy: { accessedAt: 'desc' },
      take: limit,
    });
  }

  // T-0059: Get notification preferences for a user
  async getNotificationPreferences(orgId: string, userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { orgId, userId },
    });
  }

  // T-0059: Upsert notification preference
  async updateNotificationPreference(
    orgId: string,
    userId: string,
    data: {
      channel: string;
      eventType: string;
      enabled: boolean;
      quietStart?: string;
      quietEnd?: string;
    },
  ) {
    return this.prisma.notificationPreference.upsert({
      where: {
        userId_channel_eventType: {
          userId,
          channel: data.channel,
          eventType: data.eventType,
        },
      },
      update: { enabled: data.enabled, quietStart: data.quietStart, quietEnd: data.quietEnd },
      create: { orgId, userId, ...data },
    });
  }

  // T-0060: Privacy masking — filter sensitive fields based on accessor role
  private maskChildData(data: Record<string, any>, accessorRole: string): Record<string, any> {
    // Parents see basic info; sensitive fields masked for non-admin roles
    const sensitiveFields = ['idCard', 'healthNotes', 'medicalHistory', 'emergencyContact'];
    const masked = { ...data };

    if (accessorRole === 'parent') {
      for (const field of sensitiveFields) {
        if (masked[field]) {
          masked[field] = '***MASKED***';
        }
      }
    }

    return masked;
  }

  // ── WP-2.6: T-0066 — Onboarding Templates & Progress ──

  async getOnboardingTemplates(orgId: string) {
    return this.prisma.onboardingTemplate.findMany({
      where: { orgId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOnboardingTemplate(orgId: string, dto: OnboardingTemplateDto) {
    return this.prisma.onboardingTemplate.create({
      data: { orgId, name: dto.name, roleType: dto.roleType, items: dto.items },
    });
  }

  async assignOnboarding(orgId: string, memberId: string, templateId: string) {
    return this.prisma.onboardingProgress.create({
      data: { orgId, orgMemberId: memberId, templateId },
    });
  }

  async updateOnboardingProgress(
    orgId: string,
    progressId: string,
    itemKey: string,
    completedBy: string,
  ) {
    const progress = await this.prisma.onboardingProgress.findFirst({
      where: { id: progressId, orgId },
      include: { template: true },
    });
    if (!progress) throw new NotFoundException('Onboarding progress not found');

    const completed = (progress.itemsCompleted as any[]) || [];
    if (completed.some((c: any) => c.key === itemKey)) {
      throw new BadRequestException(`Item '${itemKey}' already completed`);
    }

    completed.push({ key: itemKey, completedAt: new Date().toISOString(), completedBy });
    const templateItems = (progress.template.items as any[]) || [];
    const requiredKeys = templateItems.filter((i: any) => i.required).map((i: any) => i.key);
    const allDone = requiredKeys.every((k: string) => completed.some((c: any) => c.key === k));

    return this.prisma.onboardingProgress.update({
      where: { id: progressId },
      data: {
        itemsCompleted: completed,
        ...(allDone && { completedAt: new Date() }),
      },
    });
  }

  async getMemberOnboarding(orgId: string, memberId: string) {
    return this.prisma.onboardingProgress.findMany({
      where: { orgId, orgMemberId: memberId },
      include: { template: true },
    });
  }

  // ── WP-2.6: T-0067 — Training Records ─────────────────

  async getTrainingRecords(orgId: string, memberId: string) {
    return this.prisma.trainingRecord.findMany({
      where: { orgId, orgMemberId: memberId },
      orderBy: { completedAt: 'desc' },
    });
  }

  async recordTraining(
    orgId: string,
    memberId: string,
    dto: TrainingRecordDto,
    recordedBy: string,
  ) {
    return this.prisma.trainingRecord.create({
      data: {
        orgId,
        orgMemberId: memberId,
        trainingType: dto.trainingType,
        trainingName: dto.trainingName,
        completedAt: new Date(dto.completedAt),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        certificateUrl: dto.certificateUrl,
        notes: dto.notes,
        recordedBy,
      },
    });
  }

  // ── WP-2.6: T-0068 — Background-check & Training Expiry Queries ──

  async getExpiringCompliance(orgId: string, daysAhead = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    const [expiringChecks, expiringTraining] = await Promise.all([
      this.prisma.memberProfile.findMany({
        where: {
          orgId,
          backgroundCheckExpiry: { lte: cutoff, gte: new Date() },
        },
        select: { orgMemberId: true, backgroundCheckExpiry: true },
      }),
      this.prisma.trainingRecord.findMany({
        where: {
          orgId,
          expiresAt: { lte: cutoff, gte: new Date() },
        },
        select: { orgMemberId: true, trainingType: true, expiresAt: true },
      }),
    ]);

    return { expiringChecks, expiringTraining };
  }

  // ── WP-2.6: T-0069 — Offboarding Archive Flow ─────────

  async offboardMember(orgId: string, memberId: string, reason: string, actorUserId: string) {
    const member = await this.findById(orgId, memberId);
    if (!['active', 'suspended'].includes(member.status)) {
      throw new BadRequestException(`Cannot offboard member in status: ${member.status}`);
    }

    // Transition via lifecycle state machine
    const newStatus = this.lifecycle.transition(member.status, 'offboarding');

    const updated = await this.prisma.orgMember.update({
      where: { id: memberId },
      data: { status: newStatus },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.HRM.MEMBER_OFFBOARDED,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: { reason, previousStatus: member.status },
      actorUserId,
    });

    return updated;
  }
}
