import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { ExportService } from './export.service';
import { ActivityTimelineService } from './activity-timeline.service';
import { PdfExportService } from './pdf-export.service';
import { GlobalSearchService } from './global-search.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardsController],
  providers: [DashboardsService, ExportService, ActivityTimelineService, PdfExportService, GlobalSearchService],
  exports: [DashboardsService, ExportService, ActivityTimelineService, PdfExportService, GlobalSearchService],
})
export class DashboardsModule {}
