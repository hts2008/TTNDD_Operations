import { Module } from '@nestjs/common';
import { OrgConfigController } from './org-config.controller';
import { OrgConfigService } from './org-config.service';
import { IamController } from './iam.controller';
import { IamService } from './iam.service';
import { EventsModule } from '../../core/events';

@Module({
  imports: [EventsModule],
  controllers: [OrgConfigController, IamController],
  providers: [OrgConfigService, IamService],
  exports: [OrgConfigService, IamService],
})
export class OrgConfigModule {}
