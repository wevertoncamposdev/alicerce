import { Module } from '@nestjs/common';
import { PrismaModule } from '@core/prisma/prisma.module';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';

@Module({
  imports: [PrismaModule],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
