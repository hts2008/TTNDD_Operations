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
}
