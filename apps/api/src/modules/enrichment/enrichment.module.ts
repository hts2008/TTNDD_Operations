import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { EnrichmentController } from './enrichment.controller';
import { EnrichmentService } from './enrichment.service';

@Module({
  controllers: [EnrichmentController],
  imports: [EventsModule],

  providers: [EnrichmentService],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
