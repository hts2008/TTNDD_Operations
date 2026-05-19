import { Module } from '@nestjs/common';
import { LmsController } from './lms.controller';
import { LmsService } from './lms.service';
import { LmsBattleGateway } from './lms-battle.gateway';
import { FileStorageModule } from '../file-storage';

@Module({
  imports: [FileStorageModule],
  controllers: [LmsController],
  providers: [LmsService, LmsBattleGateway],
  exports: [LmsService],
})
export class LmsModule {}
