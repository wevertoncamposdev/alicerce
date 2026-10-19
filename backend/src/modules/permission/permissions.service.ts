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
    return this.prisma.permission.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
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
