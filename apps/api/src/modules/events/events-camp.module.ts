import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { EventsCampController } from './events-camp.controller';
import { EventsCampService } from './events-camp.service';

@Module({
  imports: [EventsModule],
  controllers: [EventsCampController],
  providers: [EventsCampService],
  exports: [EventsCampService],
})
export class EventsCampModule {}
