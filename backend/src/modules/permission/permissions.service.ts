import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { SearchPermissionDto } from './dto/search-permission.dto';
import { Prisma } from '@core/prisma/generated/client';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  // Mudar/remover uma permissão afeta todo mundo que tem qualquer role que
  // carregue essa permissão — fan-out permission → roles → usuários.
  private async invalidatePermissionCacheForPermission(
    permissionId: string,
    tenantId: string,
  ): Promise<void> {
    const roles = await this.findRolesOfPermission(permissionId, tenantId);
    const userRoles = await this.prisma.userRole.findMany({
      where: { tenantId, roleId: { in: roles.map((r) => r.roleId) } },
      select: { userId: true },
    });
    await this.permissionCache.invalidateUsers(
      tenantId,
      Array.from(new Set(userRoles.map((ur) => ur.userId))),
    );
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission || permission.deletedAt)
      throw new NotFoundException('Permission nao encontrada');
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
    if (!tenantId) {
      throw new Error('TenantId is required to create a permission');
    }

    return this.prisma.permission.create({
      data: {
        tenantId,
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

    const updated = await this.prisma.permission.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        resource: dto.resource,
        description: dto.description,
      },
    });

    // Sobretudo relevante se `name` mudou — a checagem em
    // RolesPermissionsGuard compara por nome, então um cache com o nome
    // antigo passaria a negar acesso que deveria ser concedido (ou o
    // contrário, se o nome novo colidir com outra checagem existente).
    await this.invalidatePermissionCacheForPermission(id, existing.tenantId);

    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.permission.findUnique({ where: { id } });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Permissao nao encontrada');
    }

    await this.invalidatePermissionCacheForPermission(id, existing.tenantId);

    return this.prisma.permission.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async search(query: SearchPermissionDto, tenantId?: string) {
    const page =
      query.pagination?.pageIndex !== undefined
        ? query.pagination.pageIndex + 1
        : 1;
    const limit = query.pagination?.pageSize ?? 20;

    const where: Prisma.PermissionWhereInput = {
      tenantId: tenantId ?? undefined,
      deletedAt: null,
      ...(query.searchText
        ? {
            OR: [
              { name: { contains: query.searchText, mode: 'insensitive' } },
              { resource: { contains: query.searchText, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
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
