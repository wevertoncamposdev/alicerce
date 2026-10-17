import { IsOptional, IsString } from 'class-validator';
import { SearchBaseDto } from '@core/common/dto/search-base.dto';

// Único módulo com campos de filtro próprios além da base (entity/entityId
// são exatos, não texto livre) — os demais extendem SearchBaseDto puro.
export class SearchAuditDto extends SearchBaseDto {
  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  entityId?: string;
}
