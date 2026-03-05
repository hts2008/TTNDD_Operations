import { Module } from '@nestjs/common';
import { EventsCampController } from './events-camp.controller';
import { EventsCampService } from './events-camp.service';

@Module({
  controllers: [EventsCampController],
  providers: [EventsCampService],
  exports: [EventsCampService],
})
export class EventsCampModule {}
