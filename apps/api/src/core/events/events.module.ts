import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DomainEventService } from './domain-event.service';
import { OutboxPublisher } from './outbox-publisher.service';
import { PubSubAdapter } from './pubsub-adapter.service';
import { LocalAdapter } from './local-adapter.service';
import { DatabaseModule } from '../database';

/**
 * Events module — provides DomainEventService + OutboxPublisher.
 *
 * Adapter selection:
 *   APP_ENV=production  → PubSubAdapter (GCP Pub/Sub)
 *   APP_ENV=*           → LocalAdapter (log + DB DLQ)
 */
@Module({
  imports: [ConfigModule, EventEmitterModule.forRoot(), DatabaseModule],
  providers: [
    DomainEventService,
    OutboxPublisher,
    PubSubAdapter,
    LocalAdapter,
    {
      provide: 'MESSAGING_ADAPTER',
      useFactory: (config: ConfigService, pubsub: PubSubAdapter, local: LocalAdapter) => {
        const env = config.get<string>('APP_ENV', 'development');
        if (env === 'production') {
          return pubsub;
        }
        return local;
      },
      inject: [ConfigService, PubSubAdapter, LocalAdapter],
    },
  ],
  exports: [DomainEventService],
})
export class EventsModule {}
