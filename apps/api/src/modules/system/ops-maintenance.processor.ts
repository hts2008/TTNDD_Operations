import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OpsMaintenanceService } from './ops-maintenance.service';

@Injectable()
export class OpsMaintenanceProcessor {
  private readonly logger = new Logger(OpsMaintenanceProcessor.name);

  constructor(private readonly maintenance: OpsMaintenanceService) {}

  @Cron('0 * * * *')
  async generateHourlyOpsReport() {
    const report = await this.maintenance.generateOpsReport();
    this.logger.log(`Hourly ops report saved: ${report.id}`);
    return report;
  }

  @Cron('0 1 * * *')
  async cleanupRetentionWindow() {
    const result = await this.maintenance.cleanupProcessedDomainEvents(30);
    this.logger.log(`Retention cleanup finished: deleted=${result.deletedDomainEvents}`);
    return result;
  }
}
