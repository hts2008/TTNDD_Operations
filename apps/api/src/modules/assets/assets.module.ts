import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  controllers: [AssetsController],
  imports: [EventsModule],

  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
