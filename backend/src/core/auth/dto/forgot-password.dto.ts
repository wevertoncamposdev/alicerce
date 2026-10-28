import { IsEmail, IsNotEmpty } from 'class-validator';
import { NormalizeEmail } from '@core/common/validators/normalize-email.decorator';

export class ForgotPasswordDto {
  @NormalizeEmail()
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
