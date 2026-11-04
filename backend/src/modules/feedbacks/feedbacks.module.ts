import { Module } from '@nestjs/common';
import { PrismaModule } from '@core/prisma/prisma.module';
import { NotesModule } from '@core/metadata/notes/notes.module';
import { TagsModule } from '@core/metadata/tags/tags.module';
import { FileModule } from '@core/files/file.module';
import { FeedbacksService } from './feedbacks.service';
import { FeedbacksController } from './feedbacks.controller';
import { FeedbackCommentsController } from './features/comments/feedback-comments.controller';
import { FeedbackCommentsService } from './features/comments/feedback-comments.service';

@Module({
  imports: [PrismaModule, NotesModule, TagsModule, FileModule],
  controllers: [FeedbacksController, FeedbackCommentsController],
  providers: [FeedbacksService, FeedbackCommentsService],
})
export class FeedbacksModule {}
