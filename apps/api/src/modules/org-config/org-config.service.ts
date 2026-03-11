import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';

@Injectable()
export class OrgConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── Organization ──

  async createOrganization(
    data: { slug: string; name: string; fullName?: string },
    actorUserId: string,
  ) {
    const existing = await this.prisma.organization.findUnique({ where: { slug: data.slug } });
    if (existing) throw new BadRequestException(`Organization slug '${data.slug}' already exists`);

    const org = await this.prisma.organization.create({
      data: {
        slug: data.slug,
        name: data.name,
        fullName: data.fullName,
        settings: { modules: {} },
      },
    });

    await this.audit.log({
      orgId: org.id,
      userId: actorUserId,
      action: 'org.created',
      resource: 'Organization',
      resourceId: org.id,
      newValue: org as unknown as Prisma.InputJsonValue,
    });

    await this.domainEvents.publish({
      orgId: org.id,
      eventType: DOMAIN_EVENTS.ORG.CREATED,
      aggregateId: org.id,
      aggregateType: 'Organization',
      payload: data as Prisma.InputJsonValue,
      actorUserId,
    });

    return org;
  }

  async findBySlug(slug: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug } });
    if (!org) throw new NotFoundException(`Organization '${slug}' not found`);
    return org;
  }

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException(`Organization '${id}' not found`);
    return org;
  }

  async updateInfo(
    orgId: string,
    data: { name?: string; fullName?: string; logoUrl?: string },
    actorUserId: string,
  ) {
    const old = await this.findById(orgId);
    const org = await this.prisma.organization.update({ where: { id: orgId }, data });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'org.update_info',
      resource: 'Organization',
      resourceId: orgId,
      oldValue: old as unknown as Prisma.InputJsonValue,
      newValue: org as unknown as Prisma.InputJsonValue,
    });
    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.ORG.UPDATED,
      aggregateId: orgId,
      aggregateType: 'Organization',
      payload: data as Prisma.InputJsonValue,
      actorUserId,
    });
    return org;
  }

  async updateSettings(orgId: string, settings: Prisma.InputJsonValue, actorUserId: string) {
    const old = await this.findById(orgId);
    const org = await this.prisma.organization.update({ where: { id: orgId }, data: { settings } });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'org.update_settings',
      resource: 'Organization',
      resourceId: orgId,
      oldValue: old.settings as Prisma.InputJsonValue,
      newValue: settings,
    });
    return org;
  }

  async toggleModule(orgId: string, moduleName: string, enabled: boolean, actorUserId: string) {
    const org = await this.findById(orgId);
    const currentSettings = (org.settings as Prisma.JsonObject) || {};
    const modules = (currentSettings['modules'] as Record<string, boolean>) || {};
    modules[moduleName] = enabled;
    const newSettings: Prisma.InputJsonValue = { ...currentSettings, modules };
    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: { settings: newSettings },
    });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'org.toggle_module',
      resource: 'Organization',
      resourceId: orgId,
      newValue: { moduleName, enabled },
    });
    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.ORG.MODULE_TOGGLED,
      aggregateId: orgId,
      aggregateType: 'Organization',
      payload: { moduleName, enabled },
      actorUserId,
    });
    return updated;
  }

  // ── Branches ──

  async getBranches(orgId: string) {
    return this.prisma.branch.findMany({
      where: { orgId },
      include: { units: true },
      orderBy: { minAge: 'asc' },
    });
  }

  async createBranch(
    orgId: string,
    data: {
      code: string;
      name: string;
      minAge?: number;
      maxAge?: number;
      colorTheme?: string;
      narrativeName?: string;
    },
    actorUserId: string,
  ) {
    if (data.minAge !== undefined && data.maxAge !== undefined && data.minAge >= data.maxAge) {
      throw new BadRequestException('minAge must be less than maxAge');
    }
    const branch = await this.prisma.branch.create({ data: { orgId, ...data } });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'branch.created',
      resource: 'Branch',
      resourceId: branch.id,
      newValue: branch as unknown as Prisma.InputJsonValue,
    });
    return branch;
  }

  async updateBranch(
    orgId: string,
    branchId: string,
    data: {
      name?: string;
      minAge?: number;
      maxAge?: number;
      colorTheme?: string;
      narrativeName?: string;
      settings?: Prisma.InputJsonValue;
    },
    actorUserId: string,
  ) {
    const branch = await this.prisma.branch.update({ where: { id: branchId, orgId }, data });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'branch.updated',
      resource: 'Branch',
      resourceId: branchId,
      newValue: data as Prisma.InputJsonValue,
    });
    return branch;
  }

  async deleteBranch(orgId: string, branchId: string, actorUserId: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, orgId } });
    if (!branch) throw new NotFoundException(`Branch '${branchId}' not found`);

    // Check for active members in this branch
    const memberCount = await this.prisma.orgMember.count({
      where: { orgId, branchId, status: 'active' },
    });
    if (memberCount > 0) {
      throw new BadRequestException(
        `Cannot delete branch with ${memberCount} active members. Reassign them first.`,
      );
    }

    await this.prisma.branch.delete({ where: { id: branchId } });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'branch.deleted',
      resource: 'Branch',
      resourceId: branchId,
      oldValue: branch as unknown as Prisma.InputJsonValue,
    });
    return { deleted: true };
  }

  // ── Units ──

  async getUnits(orgId: string, branchId?: string) {
    const where: Prisma.UnitWhereInput = { orgId };
    if (branchId) where.branchId = branchId;
    return this.prisma.unit.findMany({
      where,
      include: { branch: { select: { name: true, code: true } }, childUnits: true },
    });
  }

  async createUnit(
    orgId: string,
    data: {
      branchId: string;
      name: string;
      totemName?: string;
      unitType?: string;
      parentUnitId?: string;
      leaderUserId?: string;
    },
    actorUserId: string,
  ) {
    const unit = await this.prisma.unit.create({ data: { orgId, ...data } });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'unit.created',
      resource: 'Unit',
      resourceId: unit.id,
      newValue: unit as unknown as Prisma.InputJsonValue,
    });
    return unit;
  }

  async updateUnit(
    orgId: string,
    unitId: string,
    data: {
      name?: string;
      totemName?: string;
      unitType?: string;
      parentUnitId?: string;
      leaderUserId?: string;
    },
    actorUserId: string,
  ) {
    const unit = await this.prisma.unit.update({ where: { id: unitId, orgId }, data });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'unit.updated',
      resource: 'Unit',
      resourceId: unitId,
      newValue: data as Prisma.InputJsonValue,
    });
    return unit;
  }

  async deleteUnit(orgId: string, unitId: string, actorUserId: string) {
    const unit = await this.prisma.unit.findFirst({ where: { id: unitId, orgId } });
    if (!unit) throw new NotFoundException(`Unit '${unitId}' not found`);

    // Check for active members in this unit
    const memberCount = await this.prisma.orgMember.count({
      where: { orgId, unitId, status: 'active' },
    });
    if (memberCount > 0) {
      throw new BadRequestException(
        `Cannot delete unit with ${memberCount} active members. Reassign them first.`,
      );
    }

    // Check for child units
    const childCount = await this.prisma.unit.count({ where: { parentUnitId: unitId } });
    if (childCount > 0) {
      throw new BadRequestException(
        `Cannot delete unit with ${childCount} child units. Remove them first.`,
      );
    }

    await this.prisma.unit.delete({ where: { id: unitId } });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'unit.deleted',
      resource: 'Unit',
      resourceId: unitId,
      oldValue: unit as unknown as Prisma.InputJsonValue,
    });
    return { deleted: true };
  }

  // ── Members (listing only, full CRUD in HRM) ──

  async getMembers(orgId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.orgMember.findMany({
        where: { orgId },
        include: {
          user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
          branch: { select: { id: true, name: true, code: true } },
          unit: { select: { id: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.orgMember.count({ where: { orgId } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  // ── Audit Log ──

  async getAuditLog(
    orgId: string,
    filters?: { action?: string; resource?: string; from?: string; to?: string },
    page = 1,
    limit = 50,
  ) {
    return this.audit.findByOrg(
      orgId,
      {
        action: filters?.action,
        resource: filters?.resource,
        from: filters?.from ? new Date(filters.from) : undefined,
        to: filters?.to ? new Date(filters.to) : undefined,
      },
      page,
      limit,
    );
  }

  // ── T-0051: Org Chart Tree ──

  async getOrgTree(orgId: string) {
    const nodes = await this.prisma.orgChartNode.findMany({
      where: { orgId, isActive: true },
      include: {
        headMember: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    // Build tree from flat list
    const nodeMap = new Map<string, any>();
    const roots: any[] = [];

    for (const node of nodes) {
      nodeMap.set(node.id, { ...node, children: [] });
    }
    for (const node of nodes) {
      const mapped = nodeMap.get(node.id)!;
      if (node.parentNodeId && nodeMap.has(node.parentNodeId)) {
        nodeMap.get(node.parentNodeId)!.children.push(mapped);
      } else {
        roots.push(mapped);
      }
    }

    return roots;
  }

  async createOrgChartNode(
    orgId: string,
    data: {
      nodeType: string;
      name: string;
      parentNodeId?: string;
      orgMemberId?: string;
      positionTitle?: string;
      displayOrder?: number;
    },
    actorUserId: string,
  ) {
    const node = await this.prisma.orgChartNode.create({
      data: { orgId, ...data },
    });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'org_chart.node_created',
      resource: 'OrgChartNode',
      resourceId: node.id,
      newValue: node as unknown as Prisma.InputJsonValue,
    });
    return node;
  }

  // ── T-0052: Move/Reparent Org Chart Node (cycle detection) ──

  async moveOrgChartNode(
    orgId: string,
    nodeId: string,
    newParentId: string | null,
    actorUserId: string,
  ) {
    const node = await this.prisma.orgChartNode.findFirst({
      where: { id: nodeId, orgId },
    });
    if (!node) throw new NotFoundException(`OrgChartNode '${nodeId}' not found`);

    // Cycle detection: walk up from newParentId to root
    if (newParentId) {
      let current = newParentId;
      const visited = new Set<string>();
      while (current) {
        if (current === nodeId) {
          throw new BadRequestException('Cannot move node: would create a cycle');
        }
        if (visited.has(current)) break;
        visited.add(current);
        const parent = await this.prisma.orgChartNode.findUnique({
          where: { id: current },
          select: { parentNodeId: true },
        });
        if (!parent?.parentNodeId) break;
        current = parent.parentNodeId;
      }
    }

    const updated = await this.prisma.orgChartNode.update({
      where: { id: nodeId },
      data: { parentNodeId: newParentId },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'org_chart.node_moved',
      resource: 'OrgChartNode',
      resourceId: nodeId,
      oldValue: { parentNodeId: node.parentNodeId } as Prisma.InputJsonValue,
      newValue: { parentNodeId: newParentId } as Prisma.InputJsonValue,
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.ORG.UPDATED,
      aggregateId: nodeId,
      aggregateType: 'OrgChartNode',
      payload: { action: 'moved', newParentId } as Prisma.InputJsonValue,
      actorUserId,
    });

    return updated;
  }

  // ── T-0053: Assign Member to Unit ──

  async assignMemberToUnit(
    orgId: string,
    memberId: string,
    data: {
      unitId: string;
      positionTitle?: string;
      validFrom?: string;
      validTo?: string;
    },
    actorUserId: string,
  ) {
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, orgId },
    });
    if (!member) throw new NotFoundException(`OrgMember '${memberId}' not found`);

    const unit = await this.prisma.unit.findFirst({
      where: { id: data.unitId, orgId },
    });
    if (!unit) throw new NotFoundException(`Unit '${data.unitId}' not found`);

    // Update member's unit assignment
    const updated = await this.prisma.orgMember.update({
      where: { id: memberId },
      data: { unitId: data.unitId },
    });

    // Create/update OrgChartNode for this assignment
    const existingNode = await this.prisma.orgChartNode.findFirst({
      where: { orgId, orgMemberId: memberId, isActive: true },
    });

    if (existingNode) {
      // Deactivate old assignment
      await this.prisma.orgChartNode.update({
        where: { id: existingNode.id },
        data: { isActive: false, validTo: new Date() },
      });
    }

    // Find the unit's parent node in org chart (if exists)
    const unitNode = await this.prisma.orgChartNode.findFirst({
      where: { orgId, name: unit.name, nodeType: 'unit', isActive: true },
    });

    await this.prisma.orgChartNode.create({
      data: {
        orgId,
        nodeType: 'member',
        name: member.scoutName || member.heroName || memberId,
        parentNodeId: unitNode?.id,
        orgMemberId: memberId,
        positionTitle: data.positionTitle,
        validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
        validTo: data.validTo ? new Date(data.validTo) : undefined,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'member.unit_assigned',
      resource: 'OrgMember',
      resourceId: memberId,
      newValue: { unitId: data.unitId, positionTitle: data.positionTitle } as Prisma.InputJsonValue,
    });

    return updated;
  }

  // ── T-0054: Volunteer Availability ──

  async getVolunteerAvailability(
    orgId: string,
    filters?: { from?: string; to?: string; memberId?: string },
  ) {
    const where: Prisma.VolunteerAvailabilityWhereInput = { orgId };
    if (filters?.memberId) where.orgMemberId = filters.memberId;
    if (filters?.from || filters?.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }
    return this.prisma.volunteerAvailability.findMany({
      where,
      include: {
        orgMember: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async upsertVolunteerAvailability(
    orgId: string,
    memberId: string,
    data: {
      date: string;
      startTime: string;
      endTime: string;
      status?: string;
      notes?: string;
    },
    actorUserId: string,
  ) {
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, orgId },
    });
    if (!member) throw new NotFoundException(`OrgMember '${memberId}' not found`);

    const result = await this.prisma.volunteerAvailability.create({
      data: {
        orgId,
        orgMemberId: memberId,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status || 'available',
        notes: data.notes,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'volunteer.availability_set',
      resource: 'VolunteerAvailability',
      resourceId: result.id,
      newValue: data as Prisma.InputJsonValue,
    });

    return result;
  }

  async deleteVolunteerAvailability(orgId: string, availabilityId: string, actorUserId: string) {
    const record = await this.prisma.volunteerAvailability.findFirst({
      where: { id: availabilityId, orgId },
    });
    if (!record) throw new NotFoundException(`VolunteerAvailability '${availabilityId}' not found`);

    await this.prisma.volunteerAvailability.delete({ where: { id: availabilityId } });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'volunteer.availability_deleted',
      resource: 'VolunteerAvailability',
      resourceId: availabilityId,
      oldValue: record as unknown as Prisma.InputJsonValue,
    });
    return { deleted: true };
  }
}

