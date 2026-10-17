import { PartialType } from '@nestjs/swagger';
import { CreateFeedbackDto } from './create-feedback.dto';

// Não estende o `status` — mudar status é uma ação separada, restrita a
// `feedback.manage` (ver UpdateFeedbackStatusDto + FeedbacksController).
export class UpdateFeedbackDto extends PartialType(CreateFeedbackDto) {}
