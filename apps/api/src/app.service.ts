import { Injectable } from '@nestjs/common';
import { PrismaService } from './core/database';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    const db = await this.prisma.healthCheck().catch((e) => ({
      status: 'error',
      latencyMs: -1,
      error: (e as Error).message,
    }));

    return {
      status: db.status === 'ok' ? 'ok' : 'degraded',
      service: 'ttndd-ops-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      database: db,
    };
  }
}
