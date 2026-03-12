import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database';
import { SystemService } from './system.service';
import { FeatureFlagService } from './feature-flag.service';
import { SystemController } from './system.controller';
import { CostControlController } from './cost-control.controller';
import { CostDashboardController } from './cost-dashboard.controller';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [DatabaseModule],
  providers: [SystemService, FeatureFlagService],
  controllers: [SystemController, CostControlController, CostDashboardController, MetricsController],
  exports: [SystemService, FeatureFlagService],
})
export class SystemModule {}
