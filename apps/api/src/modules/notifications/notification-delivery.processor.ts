import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationDeliveryProcessor {
  private readonly logger = new Logger(NotificationDeliveryProcessor.name);

  constructor(private readonly notifications: NotificationsService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processPendingDeliveries() {
    const result = await this.notifications.processPendingDeliveries(50);
    if (result.total > 0) {
      this.logger.log(
        `Notification delivery processor: ${result.delivered} delivered, ${result.failed} failed, ${result.skipped} skipped`,
      );
    }
    return result;
  }
}
