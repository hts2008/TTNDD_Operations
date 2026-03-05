import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationEventSubscriber } from './notification-event.subscriber';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationEventSubscriber],
  exports: [NotificationsService],
})
export class NotificationsModule {}
