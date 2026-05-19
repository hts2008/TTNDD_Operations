import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationEventSubscriber } from './notification-event.subscriber';
import { NotificationDeliveryProcessor } from './notification-delivery.processor';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationEventSubscriber, NotificationDeliveryProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
