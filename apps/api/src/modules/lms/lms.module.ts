import { Module } from '@nestjs/common';
import { LmsController } from './lms.controller';
import { LmsService } from './lms.service';
import { LmsBattleGateway } from './lms-battle.gateway';

@Module({
  controllers: [LmsController],
  providers: [LmsService, LmsBattleGateway],
  exports: [LmsService],
})
export class LmsModule {}
