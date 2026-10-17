import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { SearchFeedbacksDto } from './dto/search-feedback.dto';
import { FeedbackStatus } from '@core/prisma/generated/enums';
import { findOneOrThrow } from '@core/common/utils/find-one-or-throw.util';
import {
  resolvePagination,
  buildSearchTextWhere,
  buildWhitelistedFilters,
  buildWhitelistedOrderBy,
} from '@core/common/utils/tenant-search.util';

const SEARCHABLE_FIELDS = ['title', 'description'] as const;
const FILTERABLE_FIELDS = ['title', 'status'] as const;
const SORTABLE_FIELDS = ['title', 'status', 'createdAt'] as const;

@Injectable()
export class FeedbacksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFeedbackDto, tenantId: string, createdById: string) {
    return this.prisma.feedback.create({
      data: { ...dto, tenantId, createdById },
    });
  }

  async findOne(id: string, tenantId: string) {
    return findOneOrThrow(
      await this.prisma.feedback.findUnique({ where: { id } }),
      (entry) => entry.tenantId === tenantId,
      'Feedback não encontrado',
    );
  }

  async update(id: string, dto: UpdateFeedbackDto, tenantId: string) {
    const existing = findOneOrThrow(
      await this.prisma.feedback.findUnique({ where: { id } }),
      (entry) => entry.tenantId === tenantId,
      'Feedback não encontrado',
    );

    return this.prisma.feedback.update({
      where: { id: existing.id },
      data: { ...dto },
    });
  }

  // Separado de `update`: só quem tem `feedback.manage` chega até aqui (ver
  // FeedbacksController) — nunca aceitar `status` pelo update genérico.
  async updateStatus(id: string, status: FeedbackStatus, tenantId: string) {
    const existing = findOneOrThrow(
      await this.prisma.feedback.findUnique({ where: { id } }),
      (entry) => entry.tenantId === tenantId,
      'Feedback não encontrado',
    );

    return this.prisma.feedback.update({
      where: { id: existing.id },
      data: { status },
    });
  }

  async remove(id: string, tenantId: string) {
    const existing = findOneOrThrow(
      await this.prisma.feedback.findUnique({ where: { id } }),
      (entry) => entry.tenantId === tenantId,
      'Feedback não encontrado',
    );

    return this.prisma.feedback.delete({ where: { id: existing.id } });
  }

  async search(query: SearchFeedbacksDto, tenantId: string) {
    const { page, limit, skip, take } = resolvePagination(query.pagination);

    const where = {
      tenantId,
      ...buildSearchTextWhere(query.searchText, SEARCHABLE_FIELDS),
      ...buildWhitelistedFilters(query.filters, FILTERABLE_FIELDS),
    };
    const orderBy = buildWhitelistedOrderBy(query.sort, SORTABLE_FIELDS);

    const [items, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        skip,
        take,
        orderBy: orderBy.length ? orderBy : undefined,
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
