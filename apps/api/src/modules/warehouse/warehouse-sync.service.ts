import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../core/database';

export interface WarehouseMapping {
  eventType: string;
  targetTable: string;
  transformFn: string;
  enabled: boolean;
}

/** T-0198: SPICES coverage metric for warehouse sync */
export interface SpicesCoverageMetric {
  dimension: string; // S, P, I, C, E, S
  sessionCount: number;
  eventCount: number;
  courseCount: number;
  total: number;
  percentage: number;
}

/** T-0200: Backfill job definition */
export interface BackfillJobConfig {
  entityType: string;
  targetTable: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastRunAt?: Date;
  totalRows?: number;
  processedRows?: number;
  partitionField: string;
  partitionGranularity: 'daily' | 'monthly' | 'yearly';
}

/**
 * Warehouse Sync Service — STORY-007 P7B (T-0196→T-0200)
 *
 * Default: OFF (feature flag `module.warehouse_sync`)
 * When enabled, syncs domain events to BigQuery.
 */
@Injectable()
export class WarehouseSyncService implements OnModuleInit {
  private readonly logger = new Logger(WarehouseSyncService.name);
  private enabled = false;

  /** Event → BigQuery table mappings (T-0196) */
  private readonly MAPPINGS: WarehouseMapping[] = [
    { eventType: 'member.created',      targetTable: 'dim_members',       transformFn: 'transformMember',      enabled: true },
    { eventType: 'member.updated',      targetTable: 'dim_members',       transformFn: 'transformMember',      enabled: true },
    { eventType: 'attendance.recorded',  targetTable: 'fact_attendance',   transformFn: 'transformAttendance',  enabled: true },
    { eventType: 'session.completed',    targetTable: 'fact_sessions',     transformFn: 'transformSession',     enabled: true },
    { eventType: 'exp.awarded',          targetTable: 'fact_exp',          transformFn: 'transformExp',         enabled: true },
    { eventType: 'badge.earned',         targetTable: 'fact_badges',       transformFn: 'transformBadge',       enabled: true },
    { eventType: 'skill.progressed',     targetTable: 'fact_skills',       transformFn: 'transformSkill',       enabled: true },
    { eventType: 'finance.transaction',  targetTable: 'fact_finance',      transformFn: 'transformFinance',     enabled: true },
    { eventType: 'event.registered',     targetTable: 'fact_events',       transformFn: 'transformEvent',       enabled: true },
    { eventType: 'course.completed',     targetTable: 'fact_lms',          transformFn: 'transformCourse',      enabled: true },
  ];

  /** T-0200: Backfill job configurations with partition rules */
  private readonly BACKFILL_JOBS: BackfillJobConfig[] = [
    { entityType: 'members',    targetTable: 'dim_members',     status: 'idle', partitionField: 'created_at',    partitionGranularity: 'monthly' },
    { entityType: 'sessions',   targetTable: 'fact_sessions',   status: 'idle', partitionField: 'session_date',  partitionGranularity: 'monthly' },
    { entityType: 'attendance', targetTable: 'fact_attendance',  status: 'idle', partitionField: 'check_in_time', partitionGranularity: 'daily'   },
    { entityType: 'events',     targetTable: 'fact_events',     status: 'idle', partitionField: 'start_date',    partitionGranularity: 'monthly' },
    { entityType: 'exp',        targetTable: 'fact_exp',        status: 'idle', partitionField: 'created_at',    partitionGranularity: 'monthly' },
    { entityType: 'badges',     targetTable: 'fact_badges',     status: 'idle', partitionField: 'created_at',    partitionGranularity: 'monthly' },
    { entityType: 'skills',     targetTable: 'fact_skills',     status: 'idle', partitionField: 'created_at',    partitionGranularity: 'monthly' },
    { entityType: 'finance',    targetTable: 'fact_finance',    status: 'idle', partitionField: 'created_at',    partitionGranularity: 'monthly' },
    { entityType: 'courses',    targetTable: 'fact_lms',        status: 'idle', partitionField: 'created_at',    partitionGranularity: 'yearly'  },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.enabled = !!(process.env.WAREHOUSE_SYNC_ENABLED === 'true');
    if (this.enabled) {
      this.logger.log('Warehouse sync ENABLED — starting event listener');
    } else {
      this.logger.log('Warehouse sync DISABLED (default OFF per spec)');
    }
  }

  /** T-0196: Get all event→warehouse mappings */
  getMappings(): WarehouseMapping[] {
    return this.MAPPINGS;
  }

  /** T-0197: Process a domain event for warehouse sync */
  async processEvent(eventType: string, payload: Record<string, unknown>) {
    if (!this.enabled) {
      return { synced: false, reason: 'Warehouse sync disabled' };
    }

    const mapping = this.MAPPINGS.find((m) => m.eventType === eventType && m.enabled);
    if (!mapping) {
      return { synced: false, reason: `No mapping for event: ${eventType}` };
    }

    // T-0198: Transform payload with SPICES enrichment
    const transformed = this.transform(mapping.transformFn, payload);

    // T-0199: Insert into BigQuery (stub — would use @google-cloud/bigquery)
    this.logger.debug(`[STUB] Would insert into BQ table "${mapping.targetTable}":`, transformed);

    return {
      synced: true,
      targetTable: mapping.targetTable,
      rowCount: 1,
      message: 'Stub: BigQuery insert simulated',
    };
  }

  /** T-0198: Transform event payload to BQ row format with SPICES enrichment */
  private transform(fnName: string, payload: Record<string, unknown>): Record<string, unknown> {
    // Enrich with SPICES tag extraction when available
    const spicesTags = Array.isArray(payload['spicesTags']) ? payload['spicesTags'] : [];
    const spicesFlags: Record<string, boolean> = {
      spices_s: spicesTags.includes('S'),  // Social development
      spices_p: spicesTags.includes('P'),  // Physical development
      spices_i: spicesTags.includes('I'),  // Intellectual development
      spices_c: spicesTags.includes('C'),  // Character development
      spices_e: spicesTags.includes('E'),  // Emotional development
      spices_sp: spicesTags.includes('Sp'), // Spiritual development
    };

    return {
      ...payload,
      ...spicesFlags,
      _synced_at: new Date().toISOString(),
      _transform: fnName,
      _partition_key: this.computePartitionKey(payload),
    };
  }

  /** T-0200: Compute partition key for BigQuery table partitioning */
  private computePartitionKey(payload: Record<string, unknown>): string {
    const dateFields = ['sessionDate', 'startDate', 'createdAt', 'created_at', 'check_in_time'];
    for (const field of dateFields) {
      if (payload[field]) {
        const d = new Date(payload[field] as string);
        if (!isNaN(d.getTime())) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
      }
    }
    return new Date().toISOString().slice(0, 7); // fallback: current month
  }

  /**
   * T-0198: SPICES coverage metrics
   * Aggregates SPICES tag usage across sessions, events, and courses
   */
  async getSpicesCoverageMetrics(orgId: string): Promise<SpicesCoverageMetric[]> {
    const [sessions, events, courses] = await Promise.all([
      this.prisma.session.findMany({
        where: { orgId },
        select: { spicesTags: true },
      }),
      this.prisma.event.findMany({
        where: { orgId },
        select: { spicesTags: true },
      }),
      this.prisma.course.findMany({
        where: { orgId },
        select: { spicesTags: true },
      }),
    ]);

    const dimensions = [
      { code: 'S',  label: 'Social Development' },
      { code: 'P',  label: 'Physical Development' },
      { code: 'I',  label: 'Intellectual Development' },
      { code: 'C',  label: 'Character Development' },
      { code: 'E',  label: 'Emotional Development' },
      { code: 'Sp', label: 'Spiritual Development' },
    ];

    const totalActivities = sessions.length + events.length + courses.length;

    return dimensions.map(({ code, label }) => {
      const sessionCount = sessions.filter((s) => s.spicesTags.includes(code)).length;
      const eventCount = events.filter((e) => e.spicesTags.includes(code)).length;
      const courseCount = courses.filter((c) => c.spicesTags.includes(code)).length;
      const total = sessionCount + eventCount + courseCount;

      return {
        dimension: `${code} — ${label}`,
        sessionCount,
        eventCount,
        courseCount,
        total,
        percentage: totalActivities > 0 ? Math.round((total / totalActivities) * 100) : 0,
      };
    });
  }

  /** T-0200: Get sync status / health */
  async getSyncStatus() {
    const lastEvent = await this.prisma.domainEvent.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, eventType: true },
    });

    return {
      enabled: this.enabled,
      mappingCount: this.MAPPINGS.length,
      activeMappings: this.MAPPINGS.filter((m) => m.enabled).length,
      lastEvent: lastEvent
        ? { type: lastEvent.eventType, at: lastEvent.createdAt }
        : null,
      bigqueryConfigured: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      environment: process.env.WAREHOUSE_SYNC_ENABLED === 'true' ? 'active' : 'disabled',
    };
  }

  /** T-0200: Get all backfill job configurations with partition rules */
  getBackfillJobs(): BackfillJobConfig[] {
    return this.BACKFILL_JOBS;
  }

  /**
   * T-0200: Run a backfill job for a specific entity type
   * In production, this would stream data from OLTP to BigQuery
   */
  async runBackfill(entityType: string): Promise<{
    entityType: string;
    status: 'completed' | 'failed';
    totalRows: number;
    message: string;
  }> {
    const job = this.BACKFILL_JOBS.find((j) => j.entityType === entityType);
    if (!job) {
      return { entityType, status: 'failed', totalRows: 0, message: `Unknown entity: ${entityType}` };
    }

    if (!this.enabled) {
      return { entityType, status: 'failed', totalRows: 0, message: 'Warehouse sync disabled' };
    }

    job.status = 'running';
    job.lastRunAt = new Date();

    try {
      // Count source rows for the backfill
      let count = 0;
      switch (entityType) {
        case 'members':    count = await this.prisma.orgMember.count(); break;
        case 'sessions':   count = await this.prisma.session.count(); break;
        case 'attendance': count = await this.prisma.sessionAttendance.count(); break;
        case 'events':     count = await this.prisma.event.count(); break;
        case 'exp':        count = await this.prisma.expTransaction.count(); break;
        case 'badges':     count = await this.prisma.memberBadge.count(); break;
        case 'skills':     count = await this.prisma.memberSkillProgress.count(); break;
        case 'finance':    count = await this.prisma.financialTransaction.count(); break;
        case 'courses':    count = await this.prisma.course.count(); break;
        default:           count = 0;
      }

      job.totalRows = count;
      job.processedRows = count; // Stub: mark as fully processed
      job.status = 'completed';

      this.logger.log(`Backfill ${entityType}: ${count} rows → ${job.targetTable} (partition: ${job.partitionField}/${job.partitionGranularity})`);

      return {
        entityType,
        status: 'completed',
        totalRows: count,
        message: `Stub: ${count} rows would be synced to ${job.targetTable} (partitioned by ${job.partitionField}, ${job.partitionGranularity})`,
      };
    } catch (error) {
      job.status = 'failed';
      return { entityType, status: 'failed', totalRows: 0, message: (error as Error).message };
    }
  }
}
