import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title!: string;

  // Opcional: o fluxo de criação pelo Detail (ADR 0005) cria o registro assim que o
  // campo `primary` (title) perde o foco — description pode chegar vazia e ser
  // preenchida depois pelo autosave normal.
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
