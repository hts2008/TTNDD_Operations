import { Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { DatabaseModule } from '../../core/database';
import { EventsModule } from '../../core/events';
import { AuditModule } from '../../core/audit';

@Module({
  imports: [DatabaseModule, EventsModule, AuditModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
