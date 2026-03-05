import { Module } from '@nestjs/common';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { ExportService } from './export.service';

@Module({
  controllers: [DashboardsController],
  providers: [DashboardsService, ExportService],
  exports: [DashboardsService, ExportService],
})
export class DashboardsModule {}
