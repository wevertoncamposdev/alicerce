import { BadRequestException } from '@nestjs/common';
import type { SearchBaseDto } from '@core/common/dto/search-base.dto';

/**
 * Generaliza o cálculo de paginação copiado e colado em
 * `examples`/`role`/`permission`/`user`/`tenant`.service.ts (ver PLAN.md,
 * Etapa 7.C): `pageIndex` chega 0-based (convenção do TanStack Table no
 * frontend), Prisma `skip`/`take` precisam de offset; `page`/`limit` no
 * retorno são 1-based (contrato que o frontend já espera).
 */
export function resolvePagination(pagination?: SearchBaseDto['pagination']) {
  const page =
    pagination?.pageIndex !== undefined ? pagination.pageIndex + 1 : 1;
  const limit = pagination?.pageSize ?? 20;

  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/**
 * Busca livre por texto em múltiplos campos (`OR` + `contains`
 * case-insensitive) — mesmo formato repetido em todo `search()` existente.
 * Sem `fields`, não há como aplicar texto livre num `where` genérico, então
 * retorna vazio em vez de arriscar um campo errado.
 */
export function buildSearchTextWhere(
  searchText: string | undefined,
  fields: readonly string[],
): Record<string, unknown> {
  if (!searchText || fields.length === 0) {
    return {};
  }

  return {
    OR: fields.map((field) => ({
      [field]: { contains: searchText, mode: 'insensitive' as const },
    })),
  };
}

/**
 * `SearchBaseDto.filters` é `Record<string, unknown>` livre — sem whitelist,
 * o cliente poderia filtrar por qualquer coluna do model (incluindo as que
 * não deveriam ser expostas, ex. campos de outro relacionamento). Cada
 * módulo declara explicitamente quais campos aceita; o resto é rejeitado
 * com 400 em vez de silenciosamente ignorado ou aceito.
 */
export function buildWhitelistedFilters(
  filters: SearchBaseDto['filters'],
  allowedFields: readonly string[],
): Record<string, unknown> {
  if (!filters) {
    return {};
  }

  const result: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(filters)) {
    if (!allowedFields.includes(field)) {
      throw new BadRequestException(`Filtro não permitido: "${field}"`);
    }

    result[field] = value;
  }

  return result;
}

/**
 * Mesma lógica de whitelist para `sort` — Prisma aceita um array de
 * `{ [campo]: direction }` para ordenação multi-coluna.
 */
export function buildWhitelistedOrderBy(
  sort: SearchBaseDto['sort'],
  allowedFields: readonly string[],
): Record<string, 'asc' | 'desc'>[] {
  if (!sort?.length) {
    return [];
  }

  return sort.map(({ field, direction }) => {
    if (!allowedFields.includes(field)) {
      throw new BadRequestException(
        `Campo de ordenação não permitido: "${field}"`,
      );
    }

    return { [field]: direction };
  });
}
