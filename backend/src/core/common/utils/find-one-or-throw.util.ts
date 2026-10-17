import { NotFoundException } from '@nestjs/common';

/**
 * Generaliza o padrão "buscar → comparar escopo (tenant, dono, soft-delete)
 * → 404" copiado e colado em `examples`/`role`/`permission`.service.ts
 * (ver PLAN.md, Etapa 7.C). O escopo de comparação varia por módulo
 * (examples também compara `userId`; role/permission também comparam
 * `deletedAt`) — por isso o predicado fica a cargo de quem chama, em vez de
 * o helper tentar adivinhar quais campos existem em cada entidade.
 */
export function findOneOrThrow<T>(
  entity: T | null | undefined,
  isInScope: (entity: T) => boolean,
  message = 'Recurso não encontrado',
): T {
  if (!entity || !isInScope(entity)) {
    throw new NotFoundException(message);
  }

  return entity;
}
