import { Global, Module } from '@nestjs/common';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from './storage-provider.interface';
import { LocalDiskStorageProvider } from './local-disk.provider';
import { S3StorageProvider } from './s3.provider';

// Mesmo padrão do RedisModule: @Global(), um único provider exportado.
// A escolha do driver é feita aqui, uma vez — só esta factory sabe que
// STORAGE_DRIVER existe (ver ADR 0010).
@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useFactory: (): StorageProvider => {
        const driver = process.env.STORAGE_DRIVER ?? 'local';
        return driver === 's3'
          ? new S3StorageProvider()
          : new LocalDiskStorageProvider();
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
