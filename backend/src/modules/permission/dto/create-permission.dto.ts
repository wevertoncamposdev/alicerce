import {
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { PermissionType } from '@core/prisma/generated/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
    @ApiProperty({ maxLength: 100 })
    @IsString()
    @MaxLength(100)
    name!: string;

    @ApiProperty({ enum: PermissionType })
    @IsEnum(PermissionType)
    type!: PermissionType;

    @ApiPropertyOptional({ maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    resource?: string;

    @ApiPropertyOptional({ maxLength: 255 })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string;
}
