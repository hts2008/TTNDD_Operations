import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database';
import { WarehouseSyncService } from './warehouse-sync.service';
import { WarehouseController } from './warehouse.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [WarehouseController],
  providers: [WarehouseSyncService],
  exports: [WarehouseSyncService],
})
export class WarehouseModule {}
