import { IsUUID } from 'class-validator';

export class AttachRoleUserDto {
    @IsUUID()
    tenantId!: string;

    @IsUUID()
    userId!: string;
}
