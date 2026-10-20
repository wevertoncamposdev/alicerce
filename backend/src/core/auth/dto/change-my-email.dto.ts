import { IsEmail, MaxLength } from 'class-validator';

export class ChangeMyEmailDto {
  @IsEmail()
  @MaxLength(255)
  newEmail!: string;
}
