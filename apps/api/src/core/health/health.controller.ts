import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database';
import { SyntheticProbeService } from './synthetic-probe.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly probeService: SyntheticProbeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.0.0',
      uptime: process.uptime(),
    };
  }

  @Get('canary')
  @ApiOperation({ summary: 'Canary check — verifies DB connectivity' })
  @ApiResponse({ status: 200, description: 'All systems operational' })
  @ApiResponse({ status: 503, description: 'Database unreachable' })
  async canary() {
    let dbStatus = 'ok';
    let dbLatencyMs = 0;

    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
    } catch {
      dbStatus = 'error';
    }

    const isHealthy = dbStatus === 'ok';

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: dbStatus, latencyMs: dbLatencyMs },
      },
    };
  }

  @Get('probes')
  @ApiOperation({ summary: 'Latest synthetic probe results' })
  @ApiResponse({ status: 200, description: 'Probe results array' })
  async probes() {
    const results = this.probeService.getLatestResults();
    return {
      status: results.length === 0
        ? 'pending'
        : results.every((r) => r.status === 'ok')
          ? 'ok'
          : 'degraded',
      timestamp: new Date().toISOString(),
      probes: results,
    };
  }
}

