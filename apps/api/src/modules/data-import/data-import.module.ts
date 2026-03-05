import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database';
import { DataImportService } from './data-import.service';
import { DataImportController } from './data-import.controller';

@Module({
  imports: [DatabaseModule],
  providers: [DataImportService],
  controllers: [DataImportController],
  exports: [DataImportService],
})
export class DataImportModule {}
