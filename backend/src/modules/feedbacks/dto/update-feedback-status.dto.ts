import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FeedbackStatus } from '@core/prisma/generated/enums';

const FEEDBACK_STATUSES: FeedbackStatus[] = [
  'RECEIVED',
  'IN_REVIEW',
  'PLANNED',
  'DONE',
  'DECLINED',
];

export class UpdateFeedbackStatusDto {
  @ApiProperty({ enum: FEEDBACK_STATUSES })
  @IsIn(FEEDBACK_STATUSES)
  status!: FeedbackStatus;
}
