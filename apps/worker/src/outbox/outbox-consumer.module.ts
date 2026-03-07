import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { OutboxConsumerService } from './outbox-consumer.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'rewards' },
      { name: 'reports' },
      { name: 'cleanup' },
    ),
  ],
  providers: [OutboxConsumerService],
})
export class OutboxConsumerModule {}
