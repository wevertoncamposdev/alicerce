import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '@core/common/validators/strong-password.validator';

export class CreateUserDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({ maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @IsStrongPassword()
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mfaEnabled?: boolean;
}
