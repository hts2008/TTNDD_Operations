import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventsModule } from '../../core/events';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationEventSubscriber } from './notification-event.subscriber';
import { NotificationRetryService } from './retry.service';
import {
  CHANNEL_ADAPTERS,
  InAppAdapter,
  ZaloAdapter,
  FcmAdapter,
  EmailAdapter,
} from './adapters';

@Module({
  controllers: [NotificationsController],
  imports: [EventsModule, ScheduleModule.forRoot()],
  providers: [
    NotificationsService,
    NotificationEventSubscriber,
    NotificationRetryService,
    // Channel adapters
    InAppAdapter,
    ZaloAdapter,
    FcmAdapter,
    EmailAdapter,
    {
      provide: CHANNEL_ADAPTERS,
      useFactory: (
        inApp: InAppAdapter,
        zalo: ZaloAdapter,
        fcm: FcmAdapter,
        email: EmailAdapter,
      ) => [inApp, zalo, fcm, email],
      inject: [InAppAdapter, ZaloAdapter, FcmAdapter, EmailAdapter],
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
