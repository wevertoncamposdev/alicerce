import { IsIn, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const TAG_COLORS = ['neutral', 'info', 'success', 'warning', 'danger'] as const;

export class CreateTagDto {
  @ApiProperty({
    example: 'feedback',
    description:
      'Recurso que justifica a criação (checado contra "<entity>.update")',
  })
  @IsString()
  @MaxLength(50)
  entity!: string;

  @ApiProperty({ example: 'Urgente' })
  @IsString()
  @MaxLength(60)
  name!: string;

  @ApiProperty({ enum: TAG_COLORS })
  @IsIn(TAG_COLORS)
  color!: (typeof TAG_COLORS)[number];
}
