import { IsEnum } from 'class-validator';
import { TenantServiceArea } from '@core/prisma/generated/prisma/enums';

export class CreateTenantAreaDto {
  @IsEnum(TenantServiceArea)
  area!: TenantServiceArea;
}
