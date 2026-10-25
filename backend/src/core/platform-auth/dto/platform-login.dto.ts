import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlatformLoginDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Email do usuário de plataforma',
    example: 'owner@alicerce.dev',
  })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Senha do usuário de plataforma' })
  password!: string;
}
