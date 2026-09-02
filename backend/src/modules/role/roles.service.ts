import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SearchRoleDto } from './dto/search-role.dto';
import { Prisma } from '@core/prisma/generated/client';
import { RoleRepository } from './persistence/role.repository';

@Injectable()
export class RolesService {


    constructor(
        private readonly prisma: PrismaService,
        private readonly roleRepository: RoleRepository,
    ) { }

    async findOne(id: string) {
        const role = await this.prisma.role.findUnique({ where: { id } });
        if (!role || role.deletedAt) throw new NotFoundException('Role nao encontrada');
        return role;
    }

    async findAll(tenantId: string) {
        return this.prisma.role.findMany({
            where: {
                tenantId,
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
            include: {
                users: true,
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
    }

    async create(dto: CreateRoleDto) {
        return this.prisma.role.create({
            data: {
                tenantId: dto.tenantId,
                name: dto.name,
                type: dto.type,
                description: dto.description,
                status: 'ACTIVE',
            },
        });
    }

    async update(id: string, dto: UpdateRoleDto) {
        const existing = await this.prisma.role.findUnique({ where: { id } });

        if (!existing || existing.deletedAt) {
            throw new NotFoundException('Role nao encontrada');
        }

        return this.prisma.role.update({
            where: { id },
            data: {
                name: dto.name,
                type: dto.type,
                description: dto.description,
            },
        });
    }

    async remove(id: string) {
        const existing = await this.prisma.role.findUnique({ where: { id } });

        if (!existing || existing.deletedAt) {
            throw new NotFoundException('Role nao encontrada');
        }

        return this.prisma.role.update({
            where: { id },
            data: {
                status: 'INACTIVE',
                deletedAt: new Date(),
            },
        });
    }

    async attachUser(roleId: string, tenantId: string, userId: string) {
        // validate role exists and belongs to tenant
        const role = await this.prisma.role.findUnique({ where: { id: roleId } });
        if (!role || role.deletedAt) throw new NotFoundException('Role nao encontrada');
        if (role.tenantId !== tenantId) throw new NotFoundException('Role nao encontrada para este tenant');

        // validate user exists
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.deletedAt) throw new NotFoundException('User nao encontrado');

        return this.prisma.userRole.upsert({
            where: {
                userId_roleId: {
                    userId,
                    roleId,
                },
            },
            create: {
                tenantId,
                userId,
                roleId,
            },
            update: {
                assignedAt: new Date(),
            },
        });
    }

    async detachUser(roleId: string, tenantId: string, userId: string) {
        const result = await this.prisma.userRole.deleteMany({
            where: {
                tenantId,
                roleId,
                userId,
            },
        });

        return { removed: result.count > 0 };
    }

    async attachPermission(
        roleId: string,
        tenantId: string,
        permissionId: string,
        resource?: string,
    ) {
        // validate role exists and belongs to tenant
        const role = await this.prisma.role.findUnique({ where: { id: roleId } });
        if (!role || role.deletedAt) throw new NotFoundException('Role nao encontrada');
        if (role.tenantId !== tenantId) throw new NotFoundException('Role nao encontrada para este tenant');

        // validate permission exists and belongs to tenant
        const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });
        if (!permission || permission.deletedAt) throw new NotFoundException('Permission nao encontrada');
        if (permission.tenantId !== tenantId) throw new NotFoundException('Permission nao encontrada para este tenant');

        // upsert (idempotent) by unique composite [roleId, permissionId, resource]
        const uniqueWhere = { roleId_permissionId_resource: { roleId, permissionId, resource: resource ?? null } } as any;

        return this.prisma.rolePermission.upsert({
            where: uniqueWhere,
            create: {
                tenantId,
                roleId,
                permissionId,
                resource: resource ?? null,
            },
            update: {
                // touch to update timestamp if any (no timestamp field here), keep as no-op
            },
        });
    }

    async detachPermission(roleId: string, tenantId: string, permissionId: string) {
        const result = await this.prisma.rolePermission.deleteMany({
            where: {
                tenantId,
                roleId,
                permissionId,
            },
        });

        return { removed: result.count > 0 };
    }

    async search(query: SearchRoleDto, tenantId?: string) {
        const page = query.pagination?.pageIndex !== undefined ? query.pagination.pageIndex + 1 : 1;
        const limit = query.pagination?.pageSize ?? 20;

        const where: Prisma.RoleWhereInput = {
            tenantId: tenantId ?? undefined,
            deletedAt: null,
            ...(query.searchText ? {
                OR: [
                    { name: { contains: query.searchText, mode: 'insensitive' } },
                ],
            } : {}),
        };

        const [items, total] = await Promise.all([
            this.roleRepository.search(where, (page - 1) * limit, limit),
            this.roleRepository.count(where),
        ]);

        return { items, total, page, limit };
    }

    async findPermissionsOfRole(roleId: string, tenantId: string) {
        return this.prisma.rolePermission.findMany({
            where: { roleId, tenantId },
            include: {
                permission: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        resource: true,
                        description: true,
                        tenantId: true,
                        createdAt: true,
                    },
                },
            },
        });
    }

    async findUsersOfRole(roleId: string, tenantId: string) {
        return this.prisma.userRole.findMany({
            where: { roleId, tenantId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        tenantId: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
        });
    }

    async findRolesOfUser(userId: string, tenantId: string) {
        return this.prisma.userRole.findMany({
            where: { userId, tenantId },
            include: { role: { select: { id: true, name: true, type: true, description: true } } },
        });
    }
}
