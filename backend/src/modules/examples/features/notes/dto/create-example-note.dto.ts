// dto/create-example-note.dto.ts
import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExampleNoteDto {
  @ApiProperty({ example: 'Ver esse vídeo de novo com calma' })
  @IsString()
  @MaxLength(1000)
  content!: string;
}
