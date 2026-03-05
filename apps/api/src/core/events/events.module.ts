import { Global, Module } from '@nestjs/common';
import { DomainEventService } from './domain-event.service';
import { OutboxPublisher } from './outbox-publisher.service';

@Global()
@Module({
  providers: [DomainEventService, OutboxPublisher],
  exports: [DomainEventService],
})
export class EventsModule {}
