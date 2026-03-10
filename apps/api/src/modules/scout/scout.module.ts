import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { ScoutController } from './scout.controller';
import { ScoutService } from './scout.service';
import { RankProgressionService } from './rank-progression.service';

@Module({
  controllers: [ScoutController],
  imports: [EventsModule],

  providers: [ScoutService, RankProgressionService],
  exports: [ScoutService, RankProgressionService],
})
export class ScoutModule {}
