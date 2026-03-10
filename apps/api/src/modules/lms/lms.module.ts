import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { LmsController } from './lms.controller';
import { LmsService } from './lms.service';

@Module({
  controllers: [LmsController],
  imports: [EventsModule],

  providers: [LmsService],
  exports: [LmsService],
})
export class LmsModule {}
