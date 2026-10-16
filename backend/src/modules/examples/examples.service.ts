import { Injectable } from '@nestjs/common';
import { CreateExampleDto } from './dto/create-example.dto';
import { UpdateExampleDto } from './dto/update-example.dto';
import { PrismaService } from '@src/core/prisma/prisma.service';
import { SearchExamplesDto } from './dto/search-example.dto';
import { findOneOrThrow } from '@core/common/utils/find-one-or-throw.util';
import {
  resolvePagination,
  buildSearchTextWhere,
  buildWhitelistedFilters,
  buildWhitelistedOrderBy,
} from '@core/common/utils/tenant-search.util';

// Campos que `search()` aceita em `filters`/`sort`/texto livre — ver
// PLAN.md, Etapa 7.C ("whitelist por módulo").
const SEARCHABLE_FIELDS = ['title', 'url'] as const;
const FILTERABLE_FIELDS = ['title', 'url'] as const;
const SORTABLE_FIELDS = ['title', 'url', 'createdAt'] as const;

@Injectable()
export class ExamplesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExampleDto, tenantId: string, userSub: string) {
    const existingExample = await this.prisma.example.findFirst({
      where: {
        url: dto.url,
        title: dto.title,
        tenantId: tenantId,
        userId: userSub,
      },
    });

    if (existingExample) {
      return existingExample;
    }

    return this.prisma.example.create({
      data: {
        title: dto.title,
        url: dto.url,
        userId: userSub,
        tenantId: tenantId,
      },
    });
  }

  async findAll(tenantId: string, userSub: string) {
    const examples = await this.prisma.example.findMany({
      where: {
        tenantId: tenantId,
        userId: userSub,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return examples;
  }

  async findOne(id: string, tenantId: string, userSub: string) {
    const example = findOneOrThrow(
      await this.prisma.example.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, email: true } },
          tenant: { select: { id: true, legalName: true } },
        },
      }),
      (entry) => entry.tenantId === tenantId && entry.userId === userSub,
      'Example not found or access denied',
    );

    return example;
  }

  async update(
    id: string,
    dto: UpdateExampleDto,
    tenantId: string,
    userSub: string,
  ) {
    const example = findOneOrThrow(
      await this.prisma.example.findUnique({ where: { id } }),
      (entry) => entry.tenantId === tenantId && entry.userId === userSub,
      'Example not found or access denied',
    );

    return this.prisma.example.update({
      where: { id: example.id },
      data: { ...dto },
    });
  }

  async remove(id: string, tenantId: string, userSub: string) {
    const example = findOneOrThrow(
      await this.prisma.example.findUnique({ where: { id } }),
      (entry) => entry.tenantId === tenantId && entry.userId === userSub,
      'Example not found or access denied',
    );

    return this.prisma.example.delete({ where: { id: example.id } });
  }

  async search(query: SearchExamplesDto, tenantId: string, userSub: string) {
    const { page, limit, skip, take } = resolvePagination(query.pagination);

    const where = {
      tenantId,
      userId: userSub,
      ...buildSearchTextWhere(query.searchText, SEARCHABLE_FIELDS),
      ...buildWhitelistedFilters(query.filters, FILTERABLE_FIELDS),
    };
    const orderBy = buildWhitelistedOrderBy(query.sort, SORTABLE_FIELDS);

    const [items, total] = await Promise.all([
      this.prisma.example.findMany({
        where,
        skip,
        take,
        orderBy: orderBy.length ? orderBy : undefined,
      }),
      this.prisma.example.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
