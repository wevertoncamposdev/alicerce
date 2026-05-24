import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantBoardTermDto } from './create-tenant-board-term.dto';

export class UpdateTenantBoardTermDto extends PartialType(
  CreateTenantBoardTermDto,
) {}
