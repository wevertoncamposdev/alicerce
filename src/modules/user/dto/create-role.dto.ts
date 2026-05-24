import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { RoleType } from '@core/prisma/generated/prisma/enums';

export class CreateRoleDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEnum(RoleType)
  type!: RoleType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
