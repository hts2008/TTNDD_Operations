import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationEventSubscriber } from './notification-event.subscriber';

@Module({
  controllers: [NotificationsController],
  imports: [EventsModule],

  providers: [NotificationsService, NotificationEventSubscriber],
  exports: [NotificationsService],
})
export class NotificationsModule {}
