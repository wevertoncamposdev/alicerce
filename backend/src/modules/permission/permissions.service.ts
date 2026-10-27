import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { SearchPermissionDto } from './dto/search-permission.dto';
import { Prisma } from '@core/prisma/generated/client';
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

// Lista de papéis que usam a permissão, já embutida na linha — evita N+1
// de `findRolesOfPermission` por item quando a tela (8.4, Plano Base.md)
// precisa mostrar "em quais papéis está" pra cada permissão da lista.
const WITH_ROLE_NAMES = {
  roles: { select: { role: { select: { id: true, name: true } } } },
} satisfies Prisma.PermissionInclude;

function withRoleNames<
  T extends { roles: { role: { id: string; name: string } }[] },
>(permission: T) {
  const { roles, ...rest } = permission;
  // Um papel pode ter mais de uma linha de RolePermission pra mesma
  // permissão (chave composta inclui `resource`; `replacePermissions`
  // só cria `resource: null`, mas dados antigos com `resource` custom
  // podem coexistir) — dedupe por id, senão o mesmo papel aparece
  // repetido na lista.
  const uniqueRoles = new Map(roles.map((item) => [item.role.id, item.role]));
  return { ...rest, roles: [...uniqueRoles.values()] };
}

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string, tenantId: string) {
    return findOneOrThrow(
      await this.prisma.permission.findUnique({ where: { id } }),
      (permission) => !permission.deletedAt && permission.tenantId === tenantId,
      'Permission nao encontrada',
    );
  }

  async findAll(tenantId: string) {
    const permissions = await this.prisma.permission.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: WITH_ROLE_NAMES,
    });

    return permissions.map(withRoleNames);
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
        include: WITH_ROLE_NAMES,
      }),
      this.prisma.permission.count({ where }),
    ]);

    return { items: items.map(withRoleNames), total, page, limit };
  }

  //Roles

  async findRolesOfPermission(permissionId: string, tenantId: string) {
    const rows = await this.prisma.rolePermission.findMany({
      where: { permissionId, tenantId },
      include: { role: { select: { id: true, name: true, type: true } } },
    });

    // Mesmo dedup de `withRoleNames` acima — um papel pode ter mais de uma
    // linha de RolePermission pra esta permissão (`resource` null + avulso).
    const uniqueRoles = new Map(rows.map((row) => [row.role.id, row.role]));
    return [...uniqueRoles.values()];
  }
}
