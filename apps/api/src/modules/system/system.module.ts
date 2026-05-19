import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../../core/database';
import { SystemService } from './system.service';
import { SyntheticProbeService } from './synthetic-probe.service';
import { SystemController } from './system.controller';
import { OpsMaintenanceProcessor } from './ops-maintenance.processor';
import { OpsMaintenanceService } from './ops-maintenance.service';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  providers: [SystemService, SyntheticProbeService, OpsMaintenanceService, OpsMaintenanceProcessor],
  controllers: [SystemController],
  exports: [SystemService, SyntheticProbeService, OpsMaintenanceService],
})
export class SystemModule {}
