import {
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';
import { PermissionType } from '@core/prisma/generated/enums';

export class CreatePermissionDto {
    @IsUUID()
    tenantId!: string;

    @IsString()
    @MaxLength(100)
    name!: string;

    @IsEnum(PermissionType)
    type!: PermissionType;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    resource?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string;
}
