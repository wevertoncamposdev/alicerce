import { IsEmail, MaxLength } from 'class-validator';
import { NormalizeEmail } from '@core/common/validators/normalize-email.decorator';

export class ChangeMyEmailDto {
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(255)
  newEmail!: string;
}
