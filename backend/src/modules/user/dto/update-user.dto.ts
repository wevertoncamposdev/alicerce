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
import { OnlyDigits } from '@core/common/transformers/only-digits';
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

  // Mesmo transformer de Tenant.phone (OnlyDigits — aceita máscara), mais
  // TrimToNull antes pra vazio virar `null`, nunca `""` (D2).
  @IsOptional()
  @TrimToNull()
  @OnlyDigits()
  @IsString()
  @MaxLength(20)
  phone?: string;

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
