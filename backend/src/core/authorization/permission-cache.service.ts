import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { RedisService } from '@core/redis/redis.service';
import { runWithTenantContext } from '@core/common/context/request-context';

// TTL curto o suficiente para que uma permissão revogada pare de valer em
// segundos (não nos 15min do access token) sem recarregar do Postgres em
// toda requisição — ver P7.5 no PLAN.md.
const TTL_SECONDS = 60;

const cacheKey = (tenantId: string, userId: string) =>
  `perm:${tenantId}:${userId}`;

/**
 * Fonte de verdade das permissões "frescas" de um usuário (ao contrário das
 * permissões embutidas no JWT no login, que só mudam quando o token expira).
 * Cache-aside: Redis é só um acelerador — se estiver fora do ar, cai para
 * consultar o Postgres a cada chamada (mais lento, nunca incorreto).
 */
@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger('PermissionCacheService');

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async getFreshPermissions(
    tenantId: string,
    userId: string,
  ): Promise<string[]> {
    try {
      const cached = await this.redis.client.get(cacheKey(tenantId, userId));
      if (cached !== null) {
        return JSON.parse(cached) as string[];
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao ler cache de permissões, consultando o banco: ${(error as Error).message}`,
      );
    }

    return this.reloadPermissions(tenantId, userId);
  }

  async reloadPermissions(tenantId: string, userId: string): Promise<string[]> {
    // `runWithTenantContext` é obrigatório aqui: este método é chamado pelo
    // RolesPermissionsGuard, que roda ANTES do RequestContextInterceptor
    // (guards vêm antes de interceptors no pipeline do Nest) — sem isto, a
    // extension de RLS não acha tenantId no contexto e a policy do Postgres
    // filtra todas as linhas, zerando as permissões de qualquer usuário
    // sempre que o cache do Redis está frio (ver request-context.ts).
    const userRoles = await runWithTenantContext(tenantId, () =>
      // Filtra role/permission ativas e não-deletadas — ao contrário do JWT
      // (calculado uma vez no login e nunca mais revisto), esta é a fonte
      // "fresca", então precisa refletir desativação/remoção também, não só
      // detach explícito.
      this.prisma.userRole.findMany({
        where: {
          tenantId,
          userId,
          role: { deletedAt: null, status: 'ACTIVE' },
        },
        include: {
          role: {
            include: {
              permissions: {
                where: { permission: { deletedAt: null } },
                include: { permission: true },
              },
            },
          },
        },
      }),
    );

    const permissions = Array.from(
      new Set(
        userRoles.flatMap((userRole) =>
          userRole.role.permissions.map((rolePermission) =>
            rolePermission.permission.name.toUpperCase(),
          ),
        ),
      ),
    );

    try {
      await this.redis.client.set(
        cacheKey(tenantId, userId),
        JSON.stringify(permissions),
        'EX',
        TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao gravar cache de permissões: ${(error as Error).message}`,
      );
    }

    return permissions;
  }

  // Chamado no login/registro, que já computa a lista de permissões para o
  // JWT — popular o cache de uma vez evita um miss garantido na primeira
  // requisição autenticada de cada sessão.
  async setPermissions(
    tenantId: string,
    userId: string,
    permissions: string[],
  ): Promise<void> {
    try {
      await this.redis.client.set(
        cacheKey(tenantId, userId),
        JSON.stringify(permissions.map((p) => p.toUpperCase())),
        'EX',
        TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao gravar cache de permissões no login: ${(error as Error).message}`,
      );
    }
  }

  async invalidateUser(tenantId: string, userId: string): Promise<void> {
    try {
      await this.redis.client.del(cacheKey(tenantId, userId));
    } catch (error) {
      this.logger.warn(
        `Falha ao invalidar cache de permissões: ${(error as Error).message}`,
      );
    }
  }

  async invalidateUsers(tenantId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    try {
      await this.redis.client.del(
        userIds.map((userId) => cacheKey(tenantId, userId)),
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao invalidar cache de permissões em lote: ${(error as Error).message}`,
      );
    }
  }
}
