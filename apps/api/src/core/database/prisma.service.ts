import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Execute queries with RLS context set via PostgreSQL session variables.
   * Every tenant-scoped query MUST go through this method.
   */
  async withRLS<T>(
    orgId: string,
    userId: string,
    role: string,
    fn: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // Use parameterized SET LOCAL to prevent SQL injection.
      // PostgreSQL SET LOCAL does not support $1 placeholders directly,
      // so we use format() on the server side for safety.
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_org_id', $1, true)`, orgId);
      await tx.$executeRawUnsafe(`SELECT set_config('app.user_role', $1, true)`, role);
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, true)`, userId);
      return fn(tx as PrismaClient);
    });
  }

  async healthCheck(): Promise<{ status: string; latencyMs: number }> {
    const start = Date.now();
    await this.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      latencyMs: Date.now() - start,
    };
  }
}
