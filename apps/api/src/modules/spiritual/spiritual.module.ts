import { Module } from '@nestjs/common';
import { SpiritualService } from './spiritual.service';
import { SpiritualController } from './spiritual.controller';
import { DatabaseModule } from '../../core/database';
import { EventsModule } from '../../core/events';
import { AuditModule } from '../../core/audit';

@Module({
  imports: [DatabaseModule, EventsModule, AuditModule],
  controllers: [SpiritualController],
  providers: [SpiritualService],
  exports: [SpiritualService],
})
export class SpiritualModule {}
