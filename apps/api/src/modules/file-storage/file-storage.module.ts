import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database';
import { FileStorageService } from './file-storage.service';
import { FileStorageController } from './file-storage.controller';

@Module({
  imports: [DatabaseModule],
  providers: [FileStorageService],
  controllers: [FileStorageController],
  exports: [FileStorageService],
})
export class FileStorageModule {}
