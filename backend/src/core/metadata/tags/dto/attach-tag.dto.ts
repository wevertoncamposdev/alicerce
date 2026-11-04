import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TAG_COLORS = ['neutral', 'info', 'success', 'warning', 'danger'] as const;

// `tagId` (anexar tag existente) OU `name` (criar na hora) — validado no
// service, já que é "um dos dois", não dá pra expressar em class-validator
// puro sem um validador customizado pra um caso só.
export class AttachTagDto {
  @ApiProperty({ example: 'feedback' })
  @IsString()
  @MaxLength(50)
  entity!: string;

  @ApiProperty()
  @IsUUID()
  entityId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tagId?: string;

  @ApiPropertyOptional({ example: 'Urgente' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ enum: TAG_COLORS })
  @IsOptional()
  @IsIn(TAG_COLORS)
  color?: (typeof TAG_COLORS)[number];
}
