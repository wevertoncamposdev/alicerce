import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { SearchBaseDto } from '@core/common/dto/search-base.dto';

// Único módulo com campos de filtro próprios além da base (entity/entityId
// são exatos, não texto livre; from/to são período — nenhum dos dois cabe
// no whitelist genérico de igualdade de tenant-search.util.ts) — os demais
// módulos extendem SearchBaseDto puro.
export class SearchAuditDto extends SearchBaseDto {
  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
