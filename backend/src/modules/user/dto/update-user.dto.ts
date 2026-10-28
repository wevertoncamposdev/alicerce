import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsStrongPassword } from '@core/common/validators/strong-password.validator';
import { NormalizeEmail } from '@core/common/validators/normalize-email.decorator';
import { TrimToNull } from '@core/common/transformers/trim-to-null';

export class UpdateUserDto {
  @IsOptional()
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsStrongPassword()
  password?: string;

  @IsOptional()
  @IsBoolean()
  mfaEnabled?: boolean;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}
