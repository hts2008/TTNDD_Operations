import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController],
  imports: [EventsModule],

  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
