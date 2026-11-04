import { Module } from '@nestjs/common';
import { PrismaModule } from '@core/prisma/prisma.module';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';
import { RecordTagsService } from './record-tags.service';
import { RecordTagsController } from './record-tags.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TagsController, RecordTagsController],
  providers: [TagsService, RecordTagsService],
  exports: [TagsService, RecordTagsService],
})
export class TagsModule {}
