import { Global, Module } from '@nestjs/common';
import { loadStorageConfig, STORAGE_CONFIG } from './storage.config';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_CONFIG,
      useFactory: () => loadStorageConfig(),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
