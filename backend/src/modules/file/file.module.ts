import { Module } from '@nestjs/common';
import { PrismaModule } from '@core/prisma/prisma.module';
import { FilesService } from './file.service';
import { FilesController } from './file.controller';
import { LocalStorageController } from './local-storage.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FilesController, LocalStorageController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FileModule {}
