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

    const [updatedMember] = await this.prisma.$transaction([
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
      payload: { fromBranch: member.branchId, toBranch: dto.toBranchId, reason: dto.reason },
      actorUserId,
    });

    return updatedMember;
  }

  async getOrgChart(orgId: string) {
    return this.prisma.orgChartNode.findMany({
      where: { orgId },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
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
}
