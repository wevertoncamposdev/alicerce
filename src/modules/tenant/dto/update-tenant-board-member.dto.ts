import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantBoardMemberDto } from './create-tenant-board-member.dto';

export class UpdateTenantBoardMemberDto extends PartialType(
  CreateTenantBoardMemberDto,
) {}
