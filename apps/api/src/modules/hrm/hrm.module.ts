import { Module } from '@nestjs/common';
import { HrmController } from './hrm.controller';
import { HrmService } from './hrm.service';
import { MemberLifecycleService } from './member-lifecycle.service';

@Module({
  controllers: [HrmController],
  providers: [HrmService, MemberLifecycleService],
  exports: [HrmService, MemberLifecycleService],
})
export class HrmModule {}
