import { IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty({ example: 'feedback' })
  @IsString()
  @MaxLength(50)
  entity!: string;

  @ApiProperty()
  @IsUUID()
  entityId!: string;

  @ApiProperty({ example: 'Confirmado com o time, vamos priorizar isso.' })
  @IsString()
  @MaxLength(5000)
  body!: string;
}
