import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AttachRolePermissionDto {
    @IsUUID()
    tenantId!: string;

    @IsUUID()
    permissionId!: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    resource?: string;
}
