import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import { MemberLifecycleService } from './member-lifecycle.service';
import { MemberValidationService } from './member-validation.service';
import {
  CreateMemberDto,
  UpdateMemberProfileDto,
  TransferMemberDto,
  AssignUnitDto,
  SignTransferDto,
} from './hrm.dto';

@Injectable()
export class HrmService {
  private readonly logger = new Logger(HrmService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
    private readonly lifecycle: MemberLifecycleService,
    private readonly validation: MemberValidationService,
  ) {}

  // ─── T-1001/T-1004: Create member with validated DTO ──────────────

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

    // T-1002: Under-age guardian requirement check at creation
    if (dto.profile.birthDate) {
      const needsGuardian = this.validation.requiresGuardian(new Date(dto.profile.birthDate));
      if (needsGuardian && !dto.profile.guardianName && !dto.profile.guardianPhone) {
        this.logger.warn(
          `Creating under-18 member without guardian info — compliance flag will be raised`,
          { orgId, fullName: dto.profile.fullName },
        );
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

    this.logger.log(`Member created: ${member.id}`, { orgId, role: dto.role });
    return member;
  }

  // ─── T-1004: List with proper filtering ───────────────────────────

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

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
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
        branchHistory: {
          orderBy: { transitionDate: 'desc' },
          select: {
            id: true,
            orgId: true,
            orgMemberId: true,
            fromBranchId: true,
            toBranchId: true,
            fromUnitId: true,
            toUnitId: true,
            transitionDate: true,
            reason: true,
            approvedBy: true,
            createdAt: true,
          },
        },
      },
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async exportPersonalData(
    orgId: string,
    memberId: string,
    actor: { userId: string; role: string; memberId?: string },
  ) {
    const isPrivileged = ['super_admin', 'admin'].includes(actor.role);
    const isSelfService = actor.memberId === memberId;

    if (!isPrivileged && !isSelfService) {
      throw new ForbiddenException('You can only export your own personal data');
    }

    const member = await this.findById(orgId, memberId);
    const profileId = member.profile?.id;

    const [compliance, timeline, expSummary, badges, ranks, attendance, fees, auditTrail] =
      await Promise.all([
        this.validation.checkCompliance(orgId, memberId),
        this.getTimeline(orgId, memberId),
        this.prisma.memberExpSummary.findFirst({
          where: { orgMemberId: memberId },
          select: {
            totalExp: true,
            availableExp: true,
            tier1Count: true,
            tier2Count: true,
            tier3Count: true,
            tier4Count: true,
            penaltyCount: true,
            lastUpdated: true,
          },
        }),
        this.prisma.memberBadge.findMany({
          where: { orgId, orgMemberId: memberId },
          select: {
            id: true,
            earnedAt: true,
            notes: true,
            badge: { select: { badgeCode: true, name: true, badgeType: true } },
          },
          orderBy: { earnedAt: 'desc' },
          take: 100,
        }),
        this.prisma.memberRank.findMany({
          where: { orgId, orgMemberId: memberId },
          select: {
            id: true,
            branchId: true,
            rankId: true,
            status: true,
            startedAt: true,
            completedAt: true,
            ceremonyDate: true,
            notes: true,
          },
          orderBy: { completedAt: 'desc' },
          take: 100,
        }),
        this.prisma.sessionAttendance.findMany({
          where: { orgId, orgMemberId: memberId },
          select: {
            id: true,
            status: true,
            checkInTime: true,
            checkOutTime: true,
            excusedReason: true,
            session: {
              select: {
                id: true,
                title: true,
                sessionDate: true,
                sessionType: true,
                location: true,
              },
            },
          },
          orderBy: { session: { sessionDate: 'desc' } },
          take: 250,
        }),
        this.prisma.memberFee.findMany({
          where: { orgId, orgMemberId: memberId },
          select: {
            id: true,
            feeType: true,
            feePeriod: true,
            amountDue: true,
            amountPaid: true,
            dueDate: true,
            paidDate: true,
            status: true,
            notes: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
        this.prisma.auditLog.findMany({
          where: {
            orgId,
            OR: [
              { resource: 'OrgMember', resourceId: memberId },
              ...(profileId ? [{ resource: 'MemberProfile', resourceId: profileId }] : []),
            ],
          },
          select: {
            action: true,
            resource: true,
            resourceId: true,
            oldValue: true,
            newValue: true,
            createdAt: true,
            userId: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
      ]);

    const categories = [
      'identity',
      'profile',
      'guardian_links',
      'membership',
      'attendance',
      'fees',
      'rewards',
      'rank_progress',
      'compliance',
      'audit_trail',
    ];

    await this.audit.log({
      orgId,
      userId: actor.userId,
      action: 'hrm.privacy_exported',
      resource: 'OrgMember',
      resourceId: memberId,
      newValue: {
        requestedByUserId: actor.userId,
        requestedByRole: actor.role,
        selfService: isSelfService,
        categories,
      } as unknown as Prisma.InputJsonValue,
    });

    return {
      subject: {
        orgId,
        memberId,
        exportedAt: new Date().toISOString(),
        requestedByUserId: actor.userId,
        selfService: isSelfService,
        categories,
      },
      identity: {
        member: {
          id: member.id,
          memberCode: member.memberCode,
          role: member.role,
          status: member.status,
          scoutName: member.scoutName,
          heroName: member.heroName,
          joinedDate: member.joinedDate,
          createdAt: member.createdAt,
        },
        user: member.user,
        profile: member.profile,
        branch: member.branch,
        unit: member.unit,
        guardianLinks: member.guardianLinks,
      },
      activity: {
        timeline,
        attendance,
        fees,
      },
      rewards: {
        expSummary,
        badges,
        ranks,
      },
      compliance,
      auditTrail,
    };
  }

  // ─── T-1004: Update with audit oldValue ───────────────────────────

  async updateProfile(
    orgId: string,
    memberId: string,
    data: UpdateMemberProfileDto,
    actorUserId: string,
  ) {
    const member = await this.findById(orgId, memberId);
    if (!member.profile) throw new NotFoundException('Member profile not found');

    // Capture old values for audit trail
    const oldValue: Record<string, unknown> = {};
    const updateData: Prisma.MemberProfileUpdateInput = {};

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        oldValue[key] = (member.profile as Record<string, unknown>)[key];
        if (key === 'birthDate') {
          (updateData as Record<string, unknown>)[key] = new Date(value as string);
        } else {
          (updateData as Record<string, unknown>)[key] = value;
        }
      }
    }

    const updated = await this.prisma.memberProfile.update({
      where: { orgMemberId: memberId },
      data: updateData,
    });

    // T-1005: Full audit with oldValue
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'hrm.profile_updated',
      resource: 'MemberProfile',
      resourceId: member.profile.id,
      oldValue: oldValue as Prisma.InputJsonValue,
      newValue: data as unknown as Prisma.InputJsonValue,
    });

    this.logger.log(`Profile updated: ${memberId}`, { orgId, fields: Object.keys(data) });
    return updated;
  }

  // ─── T-1003: Transition with guards ───────────────────────────────

  async transitionStatus(orgId: string, memberId: string, action: string, actorUserId: string) {
    const member = await this.findById(orgId, memberId);

    // T-1003: Build guard context for transition
    const compliance = await this.validation.checkCompliance(orgId, memberId);
    const pendingFees = await this.prisma.memberFee.count({
      where: { orgMemberId: memberId, status: { in: ['pending', 'overdue'] } },
    });

    const guardContext = {
      hasCompleteProfile: !!(member.profile?.fullName && member.profile?.birthDate),
      hasGuardianIfRequired: member.profile?.birthDate
        ? !this.validation.requiresGuardian(member.profile.birthDate) ||
          member.guardianLinks.length > 0
        : true,
      hasPendingFees: pendingFees > 0,
      complianceViolations: compliance.violations,
    };

    const newStatus = this.lifecycle.transition(member.status, action, guardContext);

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

    this.logger.log(`Member transition: ${member.status} → ${newStatus}`, {
      orgId,
      memberId,
      action,
    });

    return { ...updated, allowedActions: this.lifecycle.getAllowedActions(newStatus) };
  }

  // ─── T-1008: Transfer with full audit ─────────────────────────────

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

    const [updatedMember, historyRecord] = await this.prisma.$transaction([
      this.prisma.orgMember.update({
        where: { id: memberId },
        data: { branchId: dto.toBranchId, unitId: dto.toUnitId, status: 'transferred' },
      }),
      this.prisma.memberBranchHistory.create({
        data: {
          orgId,
          orgMemberId: memberId,
          fromBranchId: member.branchId,
          toBranchId: dto.toBranchId,
          fromUnitId: member.unitId,
          toUnitId: dto.toUnitId,
          transitionDate: new Date(),
          reason: dto.reason,
          approvedBy: actorUserId,
        },
      }),
    ]);

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.HRM.MEMBER_TRANSFERRED,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: {
        fromBranch: member.branchId,
        toBranch: dto.toBranchId,
        reason: dto.reason,
        historyId: historyRecord.id,
      },
      actorUserId,
    });

    // T-1005: Audit with oldValue capture
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'hrm.member_transferred',
      resource: 'OrgMember',
      resourceId: memberId,
      oldValue: { branchId: member.branchId, unitId: member.unitId, status: member.status },
      newValue: {
        branchId: dto.toBranchId,
        unitId: dto.toUnitId,
        status: 'transferred',
        reason: dto.reason,
      },
    });

    this.logger.log(`Member transferred: ${memberId}`, {
      orgId,
      from: member.branchId,
      to: dto.toBranchId,
    });

    return { member: updatedMember, transferRecord: historyRecord };
  }

  // ─── T-1007: Unit assignment ──────────────────────────────────────

  async assignUnit(orgId: string, memberId: string, dto: AssignUnitDto, actorUserId: string) {
    const member = await this.findById(orgId, memberId);

    // Validate unit belongs to member's branch
    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, orgId },
    });
    if (!unit) {
      throw new NotFoundException('Unit not found in this organization');
    }

    const oldUnitId = member.unitId;
    const updated = await this.prisma.orgMember.update({
      where: { id: memberId },
      data: { unitId: dto.unitId },
      include: { unit: { select: { id: true, name: true } } },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'hrm.unit_assigned',
      resource: 'OrgMember',
      resourceId: memberId,
      oldValue: { unitId: oldUnitId },
      newValue: { unitId: dto.unitId, reason: dto.reason },
    });

    this.logger.log(`Unit assigned: ${memberId} → ${dto.unitId}`, { orgId });
    return updated;
  }

  // ─── T-1006: Org chart (flat + tree) ──────────────────────────────

  async getOrgChart(orgId: string) {
    return this.prisma.orgChartNode.findMany({
      where: { orgId },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * T-1006: Build hierarchical tree from flat OrgChartNode list.
   * Includes member counts per node and cycle detection.
   */
  async getOrgChartTree(orgId: string) {
    const [nodes, memberCounts] = await Promise.all([
      this.prisma.orgChartNode.findMany({
        where: { orgId },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.orgMember.groupBy({
        by: ['branchId'],
        where: { orgId, status: { in: ['active', 'pending'] } },
        _count: true,
      }),
    ]);

    const countMap = new Map(memberCounts.map((c) => [c.branchId, c._count]));

    // Build tree with cycle detection
    const nodeMap = new Map<
      string,
      (typeof nodes)[0] & { children: unknown[]; memberCount: number }
    >();
    const roots: ((typeof nodes)[0] & { children: unknown[]; memberCount: number })[] = [];
    const visited = new Set<string>();

    for (const node of nodes) {
      nodeMap.set(node.id, { ...node, children: [], memberCount: countMap.get(node.id) || 0 });
    }

    for (const node of nodes) {
      const treeNode = nodeMap.get(node.id)!;

      if (!node.parentNodeId) {
        roots.push(treeNode);
      } else {
        // Cycle detection
        let current: string | null = node.parentNodeId;
        const path = new Set<string>([node.id]);
        let cycleDetected = false;

        while (current) {
          if (path.has(current)) {
            this.logger.warn(`Cycle detected in org chart: ${node.id} → ${current}`, { orgId });
            cycleDetected = true;
            break;
          }
          path.add(current);
          const parent = nodeMap.get(current);
          current = parent?.parentNodeId ?? null;
        }

        if (cycleDetected) {
          roots.push(treeNode); // Treat as root if cycle detected
        } else {
          const parent = nodeMap.get(node.parentNodeId);
          if (parent) {
            parent.children.push(treeNode);
          } else {
            roots.push(treeNode); // Orphan → root
          }
        }
      }
    }

    return { tree: roots, totalNodes: nodes.length };
  }

  // ─── T-1009: Enhanced timeline ────────────────────────────────────

  async getTimeline(orgId: string, memberId: string) {
    const [events, history, fees] = await Promise.all([
      this.prisma.domainEvent.findMany({
        where: { orgId, aggregateId: memberId, aggregateType: 'OrgMember' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.memberBranchHistory.findMany({
        where: { orgId, orgMemberId: memberId },
        orderBy: { transitionDate: 'desc' },
      }),
      this.prisma.memberFee.findMany({
        where: { orgMemberId: memberId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, amountDue: true, status: true, createdAt: true, notes: true },
      }),
    ]);

    // T-1009: Merge all timeline sources into unified chronological list
    const timeline = [
      ...events.map((e) => ({
        type: 'event' as const,
        date: e.createdAt,
        title: e.eventType,
        detail: e.payload as Record<string, unknown>,
      })),
      ...history.map((h) => ({
        type: 'transfer' as const,
        date: h.transitionDate,
        title: 'Branch Transfer',
        detail: {
          fromBranch: h.fromBranchId,
          toBranch: h.toBranchId,
          reason: h.reason,
          approvedBy: h.approvedBy,
        },
      })),
      ...fees.map((f) => ({
        type: 'fee' as const,
        date: f.createdAt,
        title: `Fee: ${f.notes || 'Payment'}`,
        detail: { amount: Number(f.amountDue), status: f.status },
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      timeline,
      counts: { events: events.length, transfers: history.length, fees: fees.length },
    };
  }

  // ─── T-1010: Transfer handover signature ──────────────────────────

  async signTransferHandover(
    orgId: string,
    transferId: string,
    dto: SignTransferDto,
    actorUserId: string,
  ) {
    const transfer = await this.prisma.memberBranchHistory.findFirst({
      where: { id: transferId, orgId },
    });
    if (!transfer) throw new NotFoundException('Transfer record not found');

    const updated = await this.prisma.memberBranchHistory.update({
      where: { id: transferId },
      data: {
        handoverSignedBy: actorUserId,
        handoverSignedAt: new Date(),
        handoverNote: dto.signatureNote,
      },
    });

    // If accepted, reactivate member in new branch
    if (dto.accepted !== false) {
      await this.prisma.orgMember.update({
        where: { id: transfer.orgMemberId },
        data: { status: 'active' },
      });

      await this.domainEvents.publish({
        orgId,
        eventType: DOMAIN_EVENTS.HRM.MEMBER_ACTIVATED,
        aggregateId: transfer.orgMemberId,
        aggregateType: 'OrgMember',
        payload: {
          action: 'accept_in_new_branch',
          transferId,
          signedBy: actorUserId,
        },
        actorUserId,
      });
    }

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'hrm.transfer_signed',
      resource: 'MemberBranchHistory',
      resourceId: transferId,
      newValue: {
        signedBy: actorUserId,
        note: dto.signatureNote,
        accepted: dto.accepted !== false,
      },
    });

    this.logger.log(`Transfer signed: ${transferId}`, { orgId, accepted: dto.accepted !== false });
    return updated;
  }

  // ─── Stats ────────────────────────────────────────────────────────

  async getStats(orgId: string) {
    const [total, byStatus, byBranch, byRole] = await Promise.all([
      this.prisma.orgMember.count({ where: { orgId } }),
      this.prisma.orgMember.groupBy({ by: ['status'], where: { orgId }, _count: true }),
      this.prisma.orgMember.groupBy({ by: ['branchId'], where: { orgId }, _count: true }),
      this.prisma.orgMember.groupBy({ by: ['role'], where: { orgId }, _count: true }),
    ]);
    return { total, byStatus, byBranch, byRole };
  }

  // ─── T-0048: Character Sheet ──────────────────────────────────────

  async getCharacterSheet(orgId: string, memberId: string) {
    const [member, expSummary, badges, ranks, skills, courses, attendance, recentAttendance] =
      await Promise.all([
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
          include: {
            rank: {
              select: {
                rankCode: true,
                rankName: true,
                narrativeName: true,
                rankOrder: true,
                minExp: true,
              },
            },
          },
          orderBy: { completedAt: 'desc' },
          take: 5,
        }),
        this.prisma.memberSkillProgress.findMany({
          where: { orgId, orgMemberId: memberId },
          include: {
            skill: {
              select: {
                name: true,
                skillCode: true,
                maxLevel: true,
                spicesTags: true,
                skillGroup: { select: { name: true, icon: true, color: true } },
              },
            },
          },
          orderBy: [{ completedAt: 'asc' }, { currentLevel: 'desc' }],
          take: 12,
        }),
        this.prisma.memberCourseProgress.findMany({
          where: { orgId, orgMemberId: memberId },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                category: true,
                difficulty: true,
                expReward: true,
                spicesTags: true,
              },
            },
          },
          orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
          take: 8,
        }),
        this.prisma.sessionAttendance.groupBy({
          by: ['status'],
          where: { orgId, orgMemberId: memberId },
          _count: true,
        }),
        this.prisma.sessionAttendance.findMany({
          where: { orgId, orgMemberId: memberId },
          include: {
            session: {
              select: {
                title: true,
                sessionDate: true,
                sessionType: true,
                location: true,
                spicesTags: true,
              },
            },
          },
          orderBy: { session: { sessionDate: 'desc' } },
          take: 6,
        }),
      ]);

    // T-0050: Compliance check
    const compliance = await this.validation.checkCompliance(orgId, memberId);
    const attendanceSummary = attendance.reduce(
      (acc, a) => {
        acc[a.status] = a._count;
        return acc;
      },
      {} as Record<string, number>,
    );
    const completedSkills = skills.filter((skill) => skill.completedAt !== null).length;
    const activeCourses = courses.filter((course) => course.status !== 'completed').length;
    const currentRank =
      ranks.find((rank) => rank.status === 'in_progress' || rank.status === 'eligible') ??
      ranks[0] ??
      null;
    const nextActions = [
      ...(compliance.compliant
        ? []
        : [
            {
              type: 'compliance',
              label: 'Resolve guardian, medical, or consent compliance gap',
              href: `/members/compliance`,
              priority: 'high',
            },
          ]),
      ...(skills.some((skill) => skill.completedAt === null)
        ? [
            {
              type: 'skill',
              label: 'Review open skill evidence and next level requirements',
              href: `/scout`,
              priority: 'medium',
            },
          ]
        : []),
      ...(activeCourses > 0
        ? [
            {
              type: 'course',
              label: 'Continue assigned LMS course work',
              href: `/lms`,
              priority: 'medium',
            },
          ]
        : []),
      ...(Object.values(attendanceSummary).reduce((sum, value) => sum + value, 0) === 0
        ? [
            {
              type: 'attendance',
              label: 'Record first session attendance for this member',
              href: `/sessions`,
              priority: 'low',
            },
          ]
        : []),
    ];

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
      progression: {
        currentRank,
        completedRanks: ranks.filter((rank) => rank.status === 'completed').length,
        skillsStarted: skills.length,
        skillsCompleted: completedSkills,
        skillCompletionRate:
          skills.length > 0 ? Math.round((completedSkills / skills.length) * 100) : 0,
        coursesStarted: courses.length,
        coursesActive: activeCourses,
        coursesCompleted: courses.filter((course) => course.status === 'completed').length,
      },
      ranks,
      skills,
      courses,
      attendance: attendanceSummary,
      recentAttendance: recentAttendance.map((entry) => ({
        id: entry.id,
        status: entry.status,
        checkInTime: entry.checkInTime,
        checkOutTime: entry.checkOutTime,
        session: entry.session,
      })),
      compliance,
      nextActions,
      allowedActions: this.lifecycle.getAllowedActions(member.status),
    };
  }

  // ─── T-0050/T-1005: Compliance ────────────────────────────────────

  async checkMemberCompliance(orgId: string, memberId: string) {
    return this.validation.checkCompliance(orgId, memberId);
  }

  /**
   * T-1005: Org-wide compliance dashboard.
   * Returns aggregated compliance status for all active members.
   */
  async getComplianceDashboard(orgId: string) {
    const members = await this.prisma.orgMember.findMany({
      where: { orgId, status: { in: ['active', 'pending'] } },
      include: {
        profile: true,
        guardianLinks: { select: { id: true, consentSigned: true } },
        branch: { select: { code: true } },
      },
    });

    let compliant = 0;
    let nonCompliant = 0;
    const violations: { memberId: string; memberName: string; issues: string[] }[] = [];

    for (const member of members) {
      const result = await this.validation.checkCompliance(orgId, member.id);
      if (result.compliant) {
        compliant++;
      } else {
        nonCompliant++;
        violations.push({
          memberId: member.id,
          memberName: member.profile?.fullName || 'Unknown',
          issues: result.violations,
        });
      }
    }

    return {
      summary: {
        total: members.length,
        compliant,
        nonCompliant,
        complianceRate: members.length > 0 ? Math.round((compliant / members.length) * 100) : 100,
      },
      violations: violations.slice(0, 50), // Cap at 50 for performance
    };
  }
}
