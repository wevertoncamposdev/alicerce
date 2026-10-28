import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsStrongPassword } from '@core/common/validators/strong-password.validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MaxLength(100)
  @IsStrongPassword()
  newPassword!: string;
}
