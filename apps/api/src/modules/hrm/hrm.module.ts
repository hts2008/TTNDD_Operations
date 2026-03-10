import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { HrmController } from './hrm.controller';
import { HrmService } from './hrm.service';
import { MemberLifecycleService } from './member-lifecycle.service';
import { GuardianController } from './guardian.controller';
import { GuardianService } from './guardian.service';
import { MemberValidationService } from './member-validation.service';

@Module({
  controllers: [HrmController, GuardianController],
  imports: [EventsModule],

  providers: [HrmService, MemberLifecycleService, GuardianService, MemberValidationService],
  exports: [HrmService, MemberLifecycleService, GuardianService, MemberValidationService],
})
export class HrmModule {}
