import { Module } from '@nestjs/common';
import { ScoutController } from './scout.controller';
import { ScoutService } from './scout.service';
import { RankProgressionService } from './rank-progression.service';
import { FileStorageModule } from '../file-storage';

@Module({
  imports: [FileStorageModule],
  controllers: [ScoutController],
  providers: [ScoutService, RankProgressionService],
  exports: [ScoutService, RankProgressionService],
})
export class ScoutModule {}
