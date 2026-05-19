import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database';

@Injectable()
export class OpsMaintenanceService {
  private readonly logger = new Logger(OpsMaintenanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async cleanupProcessedDomainEvents(retentionDays = 30) {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await this.prisma.domainEvent.deleteMany({
      where: {
        processed: true,
        processedAt: { lt: cutoff },
      },
    });

    this.logger.log(`Cleanup processed domain events: deleted=${result.count}`);
    return {
      deletedDomainEvents: result.count,
      cutoff: cutoff.toISOString(),
    };
  }

  async generateOpsReport() {
    const [
      organizations,
      activeUsers,
      unprocessedDomainEvents,
      pendingNotificationDeliveries,
      activeImportBatches,
    ] = await Promise.all([
      this.prisma.organization.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.domainEvent.count({ where: { processed: false } }),
      this.prisma.notificationDeliveryLog.count({ where: { status: 'pending' } }),
      this.prisma.importBatch.count({ where: { status: { in: ['processing', 'queued'] } } }),
    ]);

    const status =
      unprocessedDomainEvents === 0 &&
      pendingNotificationDeliveries === 0 &&
      activeImportBatches === 0
        ? 'PASS'
        : 'WARN';

    const reportJson = {
      generatedBy: 'ops-maintenance',
      checkedAt: new Date().toISOString(),
      counts: {
        organizations,
        activeUsers,
        unprocessedDomainEvents,
        pendingNotificationDeliveries,
        activeImportBatches,
      },
    };

    const report = await this.prisma.releaseGateReport.create({
      data: {
        environment: 'scheduled-worker',
        buildId: `ops-${new Date().toISOString().slice(0, 10)}`,
        profile: 'PROFILE_OPS',
        status,
        reportJson,
        linksJson: {},
      },
    });

    this.logger.log(`Ops report generated: status=${status}`);
    return report;
  }
}
