import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsStrongPassword } from '@core/common/validators/strong-password.validator';

export class SignUpPublicDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  tenantName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  tenantSlug!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsStrongPassword()
  password!: string;

  // Etapa 9.1 (LGPD) — aceite dos Termos de Uso no cadastro.
  @IsBoolean()
  @Equals(true, { message: 'Você precisa aceitar os Termos de Uso.' })
  acceptedTerms!: boolean;
}
