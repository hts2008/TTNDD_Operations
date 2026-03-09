import { Module } from '@nestjs/common';
import { FileStorageController } from './file-storage.controller';
import { FileStorageService } from './file-storage.service';
import { LocalStorageAdapter } from './local-storage.adapter';
import { STORAGE_ADAPTER } from './storage-adapter.interface';

@Module({
  controllers: [FileStorageController],
  providers: [
    FileStorageService,
    {
      provide: STORAGE_ADAPTER,
      useClass: LocalStorageAdapter,
    },
  ],
  exports: [FileStorageService],
})
export class FileStorageModule {}
