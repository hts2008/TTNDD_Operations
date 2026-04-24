import { Module } from '@nestjs/common';
import { HrmController } from './hrm.controller';
import { HrmService } from './hrm.service';
import { MemberLifecycleService } from './member-lifecycle.service';
import { GuardianController } from './guardian.controller';
import { GuardianService } from './guardian.service';
import { MemberValidationService } from './member-validation.service';
import { ParentPortalController } from './parent-portal.controller';

@Module({
  controllers: [HrmController, GuardianController, ParentPortalController],
  providers: [HrmService, MemberLifecycleService, GuardianService, MemberValidationService],
  exports: [HrmService, MemberLifecycleService, GuardianService, MemberValidationService],
})
export class HrmModule {}
