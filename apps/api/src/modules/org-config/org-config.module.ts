import { Module } from '@nestjs/common';
import { OrgConfigController } from './org-config.controller';
import { OrgConfigService } from './org-config.service';

@Module({
  controllers: [OrgConfigController],
  providers: [OrgConfigService],
  exports: [OrgConfigService],
})
export class OrgConfigModule {}
