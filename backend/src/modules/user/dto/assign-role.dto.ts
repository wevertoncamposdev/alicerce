import { IsOptional, IsUUID } from 'class-validator';

export class AssignRoleDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  userId!: string;

  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsUUID()
  assignedBy?: string;
}
