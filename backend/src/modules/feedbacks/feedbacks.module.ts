import { Module } from '@nestjs/common';
import { PrismaModule } from '@core/prisma/prisma.module';
import { FeedbacksService } from './feedbacks.service';
import { FeedbacksController } from './feedbacks.controller';
import { FeedbackCommentsController } from './features/comments/feedback-comments.controller';
import { FeedbackCommentsService } from './features/comments/feedback-comments.service';

@Module({
  imports: [PrismaModule],
  controllers: [FeedbacksController, FeedbackCommentsController],
  providers: [FeedbacksService, FeedbackCommentsService],
})
export class FeedbacksModule {}
