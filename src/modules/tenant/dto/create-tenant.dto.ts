import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsDateString,
  MaxLength,
  ArrayUnique,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  BoardRoleType,
  CoverageArea,
  OrganizationSize,
  PartnershipType,
  TenantCategory,
  TenantDocumentType,
  TenantServiceArea,
} from '@core/prisma/generated/prisma/enums';

export class CreateTenantDto {
  @ApiProperty({
    description: 'Nome do Tenant',
    example: 'Associação Maravilhosa',
  })
  @IsString()
  @MaxLength(255)
  legalName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradeName?: string;

  @ApiProperty({
    description: 'Número de registro do Tenant',
    example: '12345678901234',
  })
  @IsString()
  @MaxLength(20)
  registrationNumber!: string;

  @ApiProperty({
    description: 'Identificador público único usado em rotas, URLs ou subdomínios',
    example: 'associacao-maravilhosa',
  })
  @IsString()
  @MaxLength(120)
  slug!: string;

  @ApiPropertyOptional({
    description: 'Descrição do Tenant',
    example: 'texto....',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  mission?: string;

  @IsOptional()
  @IsString()
  vision?: string;

  @IsOptional()
  @IsString()
  values?: string;

  @IsEnum(TenantCategory)
  category!: TenantCategory;

  @IsEnum(TenantServiceArea)
  primaryServiceArea!: TenantServiceArea;

  @IsOptional()
  @IsEnum(PartnershipType)
  partnershipType?: PartnershipType;

  @IsOptional()
  @IsEnum(CoverageArea)
  coverageArea?: CoverageArea;

  @IsOptional()
  @IsEnum(OrganizationSize)
  organizationSize?: OrganizationSize;

  @ApiProperty({
    description: 'Data de fundação do Tenant',
    example: '2020-01-01',
  })
  @IsOptional()
  @IsDateString()
  foundedAt?: string;

  @ApiPropertyOptional({
    description: 'Data de encerramento do Tenant',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  closedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  complement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobilePhone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiProperty({
    description: 'URL de site',
    example: 'http://tenant.com',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  website?: string;

  @ApiProperty({
    description: 'URL do Instagram',
    example: 'http://instagram.com/tenant',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  instagram?: string;

  @ApiProperty({
    description: 'URL do Facebook',
    example: 'http://facebook.com/tenant',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  facebook?: string;

  @ApiProperty({
    description: 'URL do LinkedIn',
    example: 'http://linkedin.com/tenant',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  linkedin?: string;

  @IsOptional()
  @IsBoolean()
  usesVolunteers?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptsDonations?: boolean;

  @IsOptional()
  @IsBoolean()
  hasGovernmentPartnership?: boolean;

  @IsOptional()
  @IsBoolean()
  isNonProfit?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
