import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantDocumentDto } from './create-tenant-document.dto';

export class UpdateTenantDocumentDto extends PartialType(
  CreateTenantDocumentDto,
) {}
