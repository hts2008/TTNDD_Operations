import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database';

export interface TimelineEntry {
  timestamp: Date;
  actor: string;
  action: string;
  resource: string;
  resourceId: string;
  summary: string;
  module: string;
}

interface TimelineQuery {
  orgId: string;
  module?: string;
  actorId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

/**
 * Activity Timeline Service — STORY-007 T-0187
 *
 * Aggregates activity from AuditLog + DomainEvent tables into a
 * unified timeline view.
 */
@Injectable()
export class ActivityTimelineService {
  private readonly logger = new Logger(ActivityTimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTimeline(query: TimelineQuery) {
    const {
      orgId,
      module,
      actorId,
      from,
      to,
      page = 1,
      limit = 20,
    } = query;

    // ── Fetch from AuditLog ──
    const auditWhere: Record<string, unknown> = { orgId };
    if (actorId) auditWhere.userId = actorId;
    if (from || to) {
      auditWhere.createdAt = {};
      if (from) (auditWhere.createdAt as Record<string, unknown>).gte = from;
      if (to) (auditWhere.createdAt as Record<string, unknown>).lte = to;
    }
    if (module) auditWhere.resource = { contains: module, mode: 'insensitive' };

    const auditLogs = await this.prisma.auditLog.findMany({
      where: auditWhere as any,
      orderBy: { createdAt: 'desc' },
      take: limit * 2, // over-fetch since we merge two sources
    });

    // ── Fetch from DomainEvent ──
    const eventWhere: Record<string, unknown> = { orgId };
    if (actorId) eventWhere.actorUserId = actorId;
    if (from || to) {
      eventWhere.createdAt = {};
      if (from) (eventWhere.createdAt as Record<string, unknown>).gte = from;
      if (to) (eventWhere.createdAt as Record<string, unknown>).lte = to;
    }
    if (module) eventWhere.aggregateType = { contains: module, mode: 'insensitive' };

    const domainEvents = await this.prisma.domainEvent.findMany({
      where: eventWhere as any,
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
    });

    // ── Merge and sort ──
    const timeline: TimelineEntry[] = [];

    for (const log of auditLogs) {
      timeline.push({
        timestamp: log.createdAt,
        actor: log.userId ?? 'system',
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId ?? '',
        summary: `${log.action} on ${log.resource}`,
        module: this.inferModule(log.resource),
      });
    }

    for (const evt of domainEvents) {
      timeline.push({
        timestamp: evt.createdAt,
        actor: evt.actorUserId ?? 'system',
        action: evt.eventType,
        resource: evt.aggregateType,
        resourceId: evt.aggregateId,
        summary: `${evt.eventType} (${evt.aggregateType})`,
        module: this.inferModule(evt.aggregateType),
      });
    }

    // Sort by timestamp descending
    timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Paginate
    const start = (page - 1) * limit;
    const data = timeline.slice(start, start + limit);
    const total = timeline.length;

    return {
      data,
      meta: { total, page, limit, hasMore: start + limit < total },
    };
  }

  private inferModule(resource: string): string {
    const lower = resource.toLowerCase();
    if (lower.includes('member') || lower.includes('org_member')) return 'hrm';
    if (lower.includes('session') || lower.includes('attendance')) return 'scout';
    if (lower.includes('course') || lower.includes('quiz') || lower.includes('lesson')) return 'lms';
    if (lower.includes('financial') || lower.includes('fee') || lower.includes('sponsor')) return 'finance';
    if (lower.includes('asset') || lower.includes('kit') || lower.includes('uniform')) return 'armory';
    if (lower.includes('plan') || lower.includes('project') || lower.includes('ticket')) return 'planning';
    if (lower.includes('notification')) return 'notifications';
    if (lower.includes('badge') || lower.includes('exp') || lower.includes('reward')) return 'rewards';
    return 'system';
  }
}
