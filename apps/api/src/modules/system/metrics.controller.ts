import {
  Controller,
  Get,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../core/database';

/**
 * Metrics Controller — T-0230
 *
 * Post-go-live metrics for adoption, health, and incident monitoring.
 */
@ApiTags('Admin — Metrics')
@Controller('admin/metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /admin/metrics/adoption
   * User adoption metrics.
   */
  @Get('adoption')
  @ApiOperation({ summary: 'User adoption metrics' })
  @ApiResponse({ status: 200, description: 'Adoption metrics returned' })
  async getAdoption() {
    // Total members
    const totalMembers = await this.prisma.memberProfile.count();

    // Active members (logged in within last 30 days via audit log)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeLogins = await this.prisma.auditLog.findMany({
      where: {
        action: 'login',
        createdAt: { gte: thirtyDaysAgo },
      },
      distinct: ['userId'],
    });

    // Module usage (recent actions by module)
    const moduleUsage = await this.prisma.auditLog.groupBy({
      by: ['resource'],
      _count: { id: true },
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return {
      totalMembers,
      activeUsers30d: activeLogins.length,
      adoptionRate: totalMembers > 0
        ? Math.round((activeLogins.length / totalMembers) * 100)
        : 0,
      topModules: moduleUsage.map((m) => ({
        module: m.resource,
        actions: m._count.id,
      })),
      period: '30d',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /admin/metrics/health
   * System health metrics.
   */
  @Get('health')
  @ApiOperation({ summary: 'System health metrics' })
  @ApiResponse({ status: 200, description: 'Health metrics returned' })
  async getHealth() {
    // Recent errors from audit logs
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentErrors = await this.prisma.auditLog.count({
      where: {
        action: 'error',
        createdAt: { gte: oneDayAgo },
      },
    });

    const totalRequests = await this.prisma.auditLog.count({
      where: {
        createdAt: { gte: oneDayAgo },
      },
    });

    const errorRate = totalRequests > 0
      ? Math.round((recentErrors / totalRequests) * 10000) / 100
      : 0;

    return {
      uptime: '99.9%', // placeholder — real uptime from Cloud Run monitoring
      errorRate24h: `${errorRate}%`,
      totalRequests24h: totalRequests,
      errors24h: recentErrors,
      healthProbes: '/health/probes',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /admin/metrics/incidents
   * Incident tracking metrics.
   */
  @Get('incidents')
  @ApiOperation({ summary: 'Incident tracking metrics' })
  @ApiResponse({ status: 200, description: 'Incident metrics returned' })
  async getIncidents() {
    // Read incidents from audit logs (tagged as 'incident')
    const allIncidents = await this.prisma.auditLog.findMany({
      where: {
        resource: 'incident',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const openIncidents = allIncidents.filter((i) => {
      const data = i.newValue as Record<string, unknown>;
      return data?.status !== 'resolved';
    });

    const resolvedIncidents = allIncidents.filter((i) => {
      const data = i.newValue as Record<string, unknown>;
      return data?.status === 'resolved';
    });

    return {
      total: allIncidents.length,
      open: openIncidents.length,
      resolved: resolvedIncidents.length,
      recentIncidents: allIncidents.slice(0, 10).map((i) => ({
        id: i.id,
        severity: (i.newValue as Record<string, unknown>)?.severity,
        status: (i.newValue as Record<string, unknown>)?.status,
        description: (i.newValue as Record<string, unknown>)?.description,
        createdAt: i.createdAt,
      })),
      timestamp: new Date().toISOString(),
    };
  }
}
