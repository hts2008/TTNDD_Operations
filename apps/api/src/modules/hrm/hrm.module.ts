import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { HrmController } from './hrm.controller';
import { HrmService } from './hrm.service';
import { MemberLifecycleService } from './member-lifecycle.service';
import { GuardianController } from './guardian.controller';
import { GuardianService } from './guardian.service';
import { MemberValidationService } from './member-validation.service';
import { TransferCronService } from './transfer-cron.service';
import { ComplianceCronService } from './compliance-cron.service';
import { ParentPortalController } from './parent-portal.controller';

@Module({
  controllers: [HrmController, GuardianController, ParentPortalController],
  imports: [EventsModule],

  providers: [
    HrmService,
    MemberLifecycleService,
    GuardianService,
    MemberValidationService,
    TransferCronService,
    ComplianceCronService,
  ],
  exports: [HrmService, MemberLifecycleService, GuardianService, MemberValidationService],
})
export class HrmModule {}
