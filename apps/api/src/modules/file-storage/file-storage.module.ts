import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileStorageController } from './file-storage.controller';
import { FileStorageService } from './file-storage.service';
import { GcsStorageAdapter } from './gcs-storage.adapter';
import { LocalStorageAdapter } from './local-storage.adapter';
import { STORAGE_ADAPTER } from './storage-adapter.interface';

/**
 * File Storage module — provides upload/download via signed URLs.
 *
 * Adapter selection (same pattern as EventsModule):
 *   APP_ENV=production  → GcsStorageAdapter (Google Cloud Storage v4 signed URLs)
 *   APP_ENV=*           → LocalStorageAdapter (mock signed URLs for local dev)
 */
@Module({
  imports: [ConfigModule],
  controllers: [FileStorageController],
  providers: [
    FileStorageService,
    GcsStorageAdapter,
    LocalStorageAdapter,
    {
      provide: STORAGE_ADAPTER,
      useFactory: (config: ConfigService, gcs: GcsStorageAdapter, local: LocalStorageAdapter) => {
        const env = config.get<string>('APP_ENV', 'development');
        if (env === 'production') {
          return gcs;
        }
        return local;
      },
      inject: [ConfigService, GcsStorageAdapter, LocalStorageAdapter],
    },
  ],
  exports: [FileStorageService],
})
export class FileStorageModule {}
