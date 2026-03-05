import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { DOMAIN_EVENTS } from '@ttndd/constants';

@Injectable()
export class OrgConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
  ) {}

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

  async updateSettings(orgId: string, settings: Prisma.InputJsonValue, actorUserId: string) {
    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data: { settings },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.ORG.UPDATED,
      aggregateId: orgId,
      aggregateType: 'Organization',
      payload: { settings },
      actorUserId,
    });

    return org;
  }

  async toggleModule(
    orgId: string,
    moduleName: string,
    enabled: boolean,
    actorUserId: string,
  ) {
    const org = await this.findById(orgId);
    const currentSettings = (org.settings as Prisma.JsonObject) || {};
    const modules = (currentSettings['modules'] as Record<string, boolean>) || {};
    modules[moduleName] = enabled;

    const newSettings: Prisma.InputJsonValue = { ...currentSettings, modules };
    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: { settings: newSettings },
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

  async getBranches(orgId: string) {
    return this.prisma.branch.findMany({
      where: { orgId },
      include: { units: true },
    });
  }

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
}
