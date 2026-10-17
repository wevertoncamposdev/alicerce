import { Module } from '@nestjs/common';
import { FeedbacksService } from './feedbacks.service';
import { FeedbacksController } from './feedbacks.controller';
import { FeedbackCommentsController } from './features/comments/feedback-comments.controller';
import { FeedbackCommentsService } from './features/comments/feedback-comments.service';

@Module({
  controllers: [FeedbacksController, FeedbackCommentsController],
  providers: [FeedbacksService, FeedbackCommentsService],
})
export class FeedbacksModule {}
