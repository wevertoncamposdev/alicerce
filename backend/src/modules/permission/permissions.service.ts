import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { SearchPermissionDto } from './dto/search-permission.dto';
import { Prisma } from '@core/prisma/generated/client';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { findOneOrThrow } from '@core/common/utils/find-one-or-throw.util';
import {
  resolvePagination,
  buildSearchTextWhere,
  buildWhitelistedFilters,
  buildWhitelistedOrderBy,
} from '@core/common/utils/tenant-search.util';

// Ver PLAN.md, Etapa 7.C ("whitelist por módulo").
const SEARCHABLE_FIELDS = ['name', 'resource'] as const;
const FILTERABLE_FIELDS = ['name', 'type', 'resource', 'description'] as const;
const SORTABLE_FIELDS = ['name', 'type', 'resource', 'createdAt'] as const;

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

  async findOne(id: string, tenantId: string) {
    return findOneOrThrow(
      await this.prisma.permission.findUnique({ where: { id } }),
      (permission) => !permission.deletedAt && permission.tenantId === tenantId,
      'Permission nao encontrada',
    );
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

  async update(id: string, dto: UpdatePermissionDto, tenantId: string) {
    const existing = findOneOrThrow(
      await this.prisma.permission.findUnique({ where: { id } }),
      (permission) => !permission.deletedAt && permission.tenantId === tenantId,
      'Permissao nao encontrada',
    );

    const updated = await this.prisma.permission.update({
      where: { id: existing.id },
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

  async remove(id: string, tenantId: string) {
    const existing = findOneOrThrow(
      await this.prisma.permission.findUnique({ where: { id } }),
      (permission) => !permission.deletedAt && permission.tenantId === tenantId,
      'Permissao nao encontrada',
    );

    await this.invalidatePermissionCacheForPermission(id, existing.tenantId);

    return this.prisma.permission.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async search(query: SearchPermissionDto, tenantId?: string) {
    const { page, limit, skip, take } = resolvePagination(query.pagination);

    const where: Prisma.PermissionWhereInput = {
      tenantId: tenantId ?? undefined,
      deletedAt: null,
      ...buildSearchTextWhere(query.searchText, SEARCHABLE_FIELDS),
      ...buildWhitelistedFilters(query.filters, FILTERABLE_FIELDS),
    };
    const orderBy = buildWhitelistedOrderBy(query.sort, SORTABLE_FIELDS);

    const [items, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip,
        take,
        orderBy: orderBy.length ? orderBy : [{ createdAt: 'desc' }],
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
