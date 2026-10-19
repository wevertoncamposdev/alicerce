import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@core/prisma/generated/enums';
import { IsDocument } from '@core/common/validators/is-document.validator';

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

  @ApiPropertyOptional({ description: 'Nome fantasia', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradeName?: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional({
    description: 'CPF (11 dígitos) ou CNPJ (14 dígitos), só números',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsDocument()
  document?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressStreet?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  addressNumber?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressComplement?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressNeighborhood?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressCity?: string;

  @ApiPropertyOptional({ maxLength: 2, description: 'UF' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  addressState?: string;

  @ApiPropertyOptional({ maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  addressZipCode?: string;

  // Posse validada em TenantService.update (ver ADR 0010) — só aceita um
  // File que o próprio usuário enviou. Não entra na criação (onboarding
  // público não tem logo ainda) — só fica aqui porque UpdateTenantDto
  // deriva deste DTO (ver update-tenant.dto.ts).
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  logoFileId?: string;
}
