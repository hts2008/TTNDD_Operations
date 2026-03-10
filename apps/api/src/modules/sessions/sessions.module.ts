import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [SessionsController],
  imports: [EventsModule],

  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
