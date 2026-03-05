import { Module } from '@nestjs/common';
import { ChildSafetyController } from './child-safety.controller';
import { ChildSafetyService } from './child-safety.service';

@Module({
  controllers: [ChildSafetyController],
  providers: [ChildSafetyService],
  exports: [ChildSafetyService],
})
export class ChildSafetyModule {}
