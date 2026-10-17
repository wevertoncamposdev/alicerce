import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeedbackCommentDto {
  @ApiProperty({ example: 'Concordo, isso ajudaria bastante no dia a dia' })
  @IsString()
  @MaxLength(1000)
  content!: string;
}
