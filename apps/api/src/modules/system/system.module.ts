import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../../core/database';
import { SystemService } from './system.service';
import { SyntheticProbeService } from './synthetic-probe.service';
import { SystemController } from './system.controller';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  providers: [SystemService, SyntheticProbeService],
  controllers: [SystemController],
  exports: [SystemService, SyntheticProbeService],
})
export class SystemModule {}

