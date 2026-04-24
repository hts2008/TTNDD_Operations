import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';

export interface ProbeResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  error?: string;
  checkedAt: Date;
}

@Injectable()
export class SyntheticProbeService {
  private readonly logger = new Logger(SyntheticProbeService.name);
  private lastResults: ProbeResult[] = [];

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runAllProbes(): Promise<void> {
    this.lastResults = await Promise.all([
      this.probeDatabase(),
      this.probeMemory(),
      this.probeDiskLatency(),
    ]);

    const unhealthy = this.lastResults.filter((r) => r.status === 'unhealthy');
    if (unhealthy.length > 0) {
      this.logger.error(
        `Unhealthy probes: ${unhealthy.map((r) => r.name).join(', ')}`,
      );
    }
  }

  getLastResults(): ProbeResult[] {
    return this.lastResults;
  }

  getOverallStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    if (this.lastResults.length === 0) return 'healthy';
    if (this.lastResults.some((r) => r.status === 'unhealthy')) return 'unhealthy';
    if (this.lastResults.some((r) => r.status === 'degraded')) return 'degraded';
    return 'healthy';
  }

  async probeDatabase(): Promise<ProbeResult> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1 AS health_check`;
      const latencyMs = Date.now() - start;
      return {
        name: 'database',
        status: latencyMs > 1000 ? 'degraded' : 'healthy',
        latencyMs,
        checkedAt: new Date(),
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: (error as Error).message,
        checkedAt: new Date(),
      };
    }
  }

  async probeMemory(): Promise<ProbeResult> {
    const start = Date.now();
    try {
      const mem = process.memoryUsage();
      const heapUsedMb = mem.heapUsed / 1024 / 1024;
      const heapTotalMb = mem.heapTotal / 1024 / 1024;
      const usagePercent = (heapUsedMb / heapTotalMb) * 100;
      const latencyMs = Date.now() - start;

      let status: ProbeResult['status'] = 'healthy';
      if (usagePercent > 90) status = 'unhealthy';
      else if (usagePercent > 75) status = 'degraded';

      return {
        name: 'memory',
        status,
        latencyMs,
        checkedAt: new Date(),
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: (error as Error).message,
        checkedAt: new Date(),
      };
    }
  }

  async probeDiskLatency(): Promise<ProbeResult> {
    const start = Date.now();
    try {
      const testData = JSON.stringify({ probe: true, ts: Date.now() });
      JSON.parse(testData);
      const latencyMs = Date.now() - start;

      return {
        name: 'serialization',
        status: latencyMs > 50 ? 'degraded' : 'healthy',
        latencyMs,
        checkedAt: new Date(),
      };
    } catch (error) {
      return {
        name: 'serialization',
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: (error as Error).message,
        checkedAt: new Date(),
      };
    }
  }
}
