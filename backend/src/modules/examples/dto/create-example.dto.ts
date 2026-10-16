import { IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExampleDto {
  @ApiProperty({
    description: 'Exemplos do usuário',
    example: 'Meu Exemplo',
  })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    description: 'URL do exemplo',
    example: 'https://www.example.com',
  })
  @IsUrl()
  url!: string;
}
