import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { AuditType } from '@core/prisma/generated/enums';
import { Prisma } from '@core/prisma/generated/client';
import { SearchAuditDto } from './dto/search-audit.dto';
import { findOneOrThrow } from '@core/common/utils/find-one-or-throw.util';
import {
  resolvePagination,
  buildSearchTextWhere,
  buildWhitelistedFilters,
  buildWhitelistedOrderBy,
} from '@core/common/utils/tenant-search.util';

interface RegisterAuditInput {
  tenantId?: string;
  userId?: string;
  type?: AuditType;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  payload?: unknown;
}

const AUDIT_INCLUDE = {
  user: { select: { id: true, email: true } }, // nunca inclua "password" aqui
  tenant: { select: { id: true, legalName: true } },
} as const;

// Ver PLAN.md, Etapa 7.C ("whitelist por módulo").
const SEARCHABLE_FIELDS = ['action'] as const;
const FILTERABLE_FIELDS = ['entity', 'entityId', 'type'] as const;
const SORTABLE_FIELDS = ['createdAt', 'action', 'entity'] as const;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async register({
    tenantId,
    userId,
    type,
    action,
    entity,
    entityId,
    before,
    payload,
  }: RegisterAuditInput) {
    if (!tenantId || !userId) {
      return;
    }

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId,
        type: type ?? 'DATA_CHANGE',
        action,
        entity,
        entityId,
        before: before !== undefined ? JSON.stringify(before) : null,
        after: JSON.stringify(payload),
      },
    });
  }

  async findAll(
    tenantId: string,
    filters?: { entity?: string; entityId?: string },
  ) {
    const response = await this.prisma.audit.findMany({
      where: {
        tenantId,
        ...(filters?.entity ? { entity: filters.entity } : {}),
        ...(filters?.entityId ? { entityId: filters.entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: AUDIT_INCLUDE,
    });
    return response;
  }

  async findOne(id: string, tenantId: string) {
    return findOneOrThrow(
      await this.prisma.audit.findUnique({
        where: { id },
        include: AUDIT_INCLUDE,
      }),
      (entry) => entry.tenantId === tenantId,
      'Registro de auditoria não encontrado',
    );
  }

  async search(query: SearchAuditDto, tenantId: string) {
    const { page, limit, skip, take } = resolvePagination(query.pagination);

    const where: Prisma.AuditWhereInput = {
      tenantId,
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...buildSearchTextWhere(query.searchText, SEARCHABLE_FIELDS),
      ...buildWhitelistedFilters(query.filters, FILTERABLE_FIELDS),
    };
    const orderBy = buildWhitelistedOrderBy(query.sort, SORTABLE_FIELDS);

    const [items, total] = await Promise.all([
      this.prisma.audit.findMany({
        where,
        skip,
        take,
        orderBy: orderBy.length ? orderBy : [{ createdAt: 'desc' }],
        include: AUDIT_INCLUDE,
      }),
      this.prisma.audit.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
