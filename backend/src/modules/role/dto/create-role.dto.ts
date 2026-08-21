import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { RoleType } from '@core/prisma/generated/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: RoleType })
  @IsEnum(RoleType)
  type!: RoleType;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
