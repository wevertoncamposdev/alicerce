import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({
    description: 'Nome do Tenant',
    example: 'Associação Maravilhosa',
  })
  @IsString()
  @MaxLength(255)
  legalName!: string;

  @ApiProperty({
    description:
      'Identificador público único usado em rotas, URLs ou subdomínios',
    example: 'associacao-maravilhosa',
  })
  @IsString()
  @MaxLength(120)
  slug!: string;
}
