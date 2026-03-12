import {
  Controller,
  Get,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../core/database';

/**
 * Cost Dashboard Controller — T-0215
 *
 * Provides cost monitoring endpoints for admin dashboard.
 * Reads budget events from audit logs and health probes.
 */
@ApiTags('Admin — Cost Dashboard')
@Controller('admin/cost')
export class CostDashboardController {
  private readonly logger = new Logger(CostDashboardController.name);

  /** Monthly budget in VND */
  private readonly MONTHLY_BUDGET = 800_000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /admin/cost/summary
   * Current month cost summary.
   */
  @Get('summary')
  @ApiOperation({ summary: 'Monthly cost summary' })
  @ApiResponse({ status: 200, description: 'Cost summary returned' })
  async getSummary() {
    // Read latest budget alerts from audit logs
    const recentAlerts = await this.prisma.auditLog.findMany({
      where: {
        resource: 'budget_alert',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Read current feature flag overrides (degradation state)
    const flagOverrides = await this.prisma.auditLog.findMany({
      where: {
        resource: 'feature_flag',
        action: 'override',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Determine current degradation level from most recent alert
    const latestAlert = recentAlerts[0];
    let currentLevel = 'normal';
    if (latestAlert?.newValue) {
      const alertData = latestAlert.newValue as Record<string, unknown>;
      currentLevel = (alertData.level as string) || 'normal';
    }

    return {
      budget: {
        monthly: this.MONTHLY_BUDGET,
        currency: 'VND',
      },
      currentLevel,
      recentAlerts: recentAlerts.map((a) => ({
        id: a.id,
        level: (a.newValue as Record<string, unknown>)?.level,
        costPercent: (a.newValue as Record<string, unknown>)?.costPercent,
        timestamp: a.createdAt,
      })),
      activeOverrides: flagOverrides
        .filter((f) => {
          const nv = f.newValue as Record<string, unknown>;
          return nv?.enabled === false;
        })
        .map((f) => ({
          flag: f.resourceId,
          disabledAt: f.createdAt,
        })),
      cloudRun: {
        maxInstances: 3,
        concurrency: 80,
        memory: '512Mi',
        cpuThrottling: true,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /admin/cost/history
   * Budget alert history for charting.
   */
  @Get('history')
  @ApiOperation({ summary: 'Budget alert history' })
  @ApiResponse({ status: 200, description: 'Alert history returned' })
  async getHistory() {
    const alerts = await this.prisma.auditLog.findMany({
      where: {
        resource: 'budget_alert',
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return {
      records: alerts.map((a) => ({
        timestamp: a.createdAt,
        level: (a.newValue as Record<string, unknown>)?.level,
        costPercent: (a.newValue as Record<string, unknown>)?.costPercent,
        threshold: (a.newValue as Record<string, unknown>)?.threshold,
      })),
      totalRecords: alerts.length,
    };
  }
}
