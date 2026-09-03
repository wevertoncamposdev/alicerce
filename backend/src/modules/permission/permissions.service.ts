import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { SearchPermissionDto } from './dto/search-permission.dto';
import { Prisma } from '@core/prisma/generated/client';

@Injectable()
export class PermissionsService {
    constructor(private readonly prisma: PrismaService) { }

    async findOne(id: string) {
        const permission = await this.prisma.permission.findUnique({ where: { id } });
        if (!permission || permission.deletedAt) throw new NotFoundException('Permission nao encontrada');
        return permission;
    }

    async findAll(tenantId: string) {
        return this.prisma.permission.findMany({
            where: {
                tenantId,
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });
    }


    async create(dto: CreatePermissionDto, tenantId?: string) {
        const effectiveTenantId = tenantId ?? dto.tenantId;

        if (!effectiveTenantId) {
            throw new Error('TenantId is required to create a permission');
        }

        return this.prisma.permission.create({
            data: {
                tenantId: effectiveTenantId,
                name: dto.name,
                type: dto.type,
                resource: dto.resource,
                description: dto.description,
            },
        });
    }

    async update(id: string, dto: UpdatePermissionDto) {
        const existing = await this.prisma.permission.findUnique({ where: { id } });

        if (!existing || existing.deletedAt) {
            throw new NotFoundException('Permissao nao encontrada');
        }

        return this.prisma.permission.update({
            where: { id },
            data: {
                name: dto.name,
                type: dto.type,
                resource: dto.resource,
                description: dto.description,
            },
        });
    }

    async remove(id: string) {
        const existing = await this.prisma.permission.findUnique({ where: { id } });

        if (!existing || existing.deletedAt) {
            throw new NotFoundException('Permissao nao encontrada');
        }

        return this.prisma.permission.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    async search(query: SearchPermissionDto, tenantId?: string) {
        const page = query.pagination?.pageIndex !== undefined ? query.pagination.pageIndex + 1 : 1;
        const limit = query.pagination?.pageSize ?? 20;

        const where: Prisma.PermissionWhereInput = {
            tenantId: tenantId ?? undefined,
            deletedAt: null,
            ...(query.searchText ? {
                OR: [
                    { name: { contains: query.searchText, mode: 'insensitive' } },
                    { resource: { contains: query.searchText, mode: 'insensitive' } },
                ],
            } : {}),
        };

        const [items, total] = await Promise.all([
            this.prisma.permission.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
            this.prisma.permission.count({ where }),
        ]);

        return { items, total, page, limit };
    }

    //Roles

    async findRolesOfPermission(permissionId: string, tenantId: string) {
        return this.prisma.rolePermission.findMany({
            where: { permissionId, tenantId },
            include: { role: { select: { id: true, name: true, type: true } } },
        });
    }
}
