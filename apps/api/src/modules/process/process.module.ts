import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { ProcessController } from './process.controller';
import { ProcessService } from './process.service';

@Module({
  controllers: [ProcessController],
  imports: [EventsModule],

  providers: [ProcessService],
  exports: [ProcessService],
})
export class ProcessModule {}
