import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';

// `slug` nunca entra num update (imutável após a criação — Plano Base.md
// 5.1), em nenhuma rota, não só em /tenant/current.
export class UpdateTenantDto extends PartialType(
  OmitType(CreateTenantDto, ['slug'] as const),
) {}
