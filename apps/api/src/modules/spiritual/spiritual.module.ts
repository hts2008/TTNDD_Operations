import { Module } from '@nestjs/common';
import { SpiritualService } from './spiritual.service';
import { SpiritualController } from './spiritual.controller';

@Module({
  controllers: [SpiritualController],
  providers: [SpiritualService],
  exports: [SpiritualService],
})
export class SpiritualModule {}
