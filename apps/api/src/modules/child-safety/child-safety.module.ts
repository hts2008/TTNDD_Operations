import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { ChildSafetyController } from './child-safety.controller';
import { ChildSafetyService } from './child-safety.service';

@Module({
  controllers: [ChildSafetyController],
  imports: [EventsModule],

  providers: [ChildSafetyService],
  exports: [ChildSafetyService],
})
export class ChildSafetyModule {}
