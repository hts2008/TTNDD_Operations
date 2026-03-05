import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';

@Module({
  imports: [DatabaseModule],
  providers: [SystemService],
  controllers: [SystemController],
  exports: [SystemService],
})
export class SystemModule {}
