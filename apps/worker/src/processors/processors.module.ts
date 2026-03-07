import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationProcessor } from './notification.processor';
import { RewardProcessor } from './reward.processor';
import { ReportProcessor } from './report.processor';
import { CleanupProcessor } from './cleanup.processor';
import { DlqProcessor } from './dlq.processor';
import { DatabaseModule } from '../core/database';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'rewards' },
      { name: 'reports' },
      { name: 'cleanup' },
      { name: 'dlq' },
    ),
    DatabaseModule,
  ],
  providers: [
    NotificationProcessor,
    RewardProcessor,
    ReportProcessor,
    CleanupProcessor,
    DlqProcessor,
  ],
})
export class ProcessorsModule {}
