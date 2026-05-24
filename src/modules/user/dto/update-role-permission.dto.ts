import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PermissionType } from '@core/prisma/generated/prisma/enums';

export class UpdateRolePermissionDto {
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsEnum(PermissionType)
  permission?: PermissionType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  resource?: string;
}
