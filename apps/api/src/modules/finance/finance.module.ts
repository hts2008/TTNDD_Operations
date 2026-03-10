import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  controllers: [FinanceController],
  imports: [EventsModule],

  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
