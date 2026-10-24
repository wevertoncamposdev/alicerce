import { Prisma, PrismaClient } from '@core/prisma/generated/client';
import { getCurrentTenantId } from '@core/common/context/request-context';

/**
 * Tabelas com coluna `tenantId` e política de RLS criada no Postgres (ver
 * migration add_tenant_rls). Fora desta lista a RLS não existe — a extension
 * passa a query direto, sem abrir transação.
 */
const TENANT_SCOPED_MODELS = new Set<Prisma.ModelName>([
  'User',
  'Role',
  'Permission',
  'UserRole',
  'RolePermission',
  'Audit',
  'Feedback',
  'FeedbackComment',
  'RefreshToken',
  'File',
  'AccountToken',
  'ConsentRecord',
]);

/**
 * `SET LOCAL`/`set_config(..., true)` só tem efeito dentro de uma transação
 * e precisa valer na MESMA conexão que vai executar a query real — com um
 * pool de conexões (adapter-pg), isso só é garantido abrindo uma transação
 * interativa (`$transaction`) por operação. É o custo real de ter RLS como
 * defesa-em-profundidade: cada leitura/escrita passa a ser no mínimo um
 * BEGIN + SET + query + COMMIT em vez de uma query solta.
 *
 * `rawClient` precisa ser uma instância NUNCA estendida, separada de `client`
 * (o `this` de PrismaService, que `Object.assign` deixa com extensão
 * aplicada) — descoberto empiricamente: `Object.assign(this, this.$extends(...))`
 * também copia o estado interno de extensões do Prisma, então até uma
 * referência de `$transaction` capturada *antes* do assign passa a abrir
 * transações cujo `tx` já volta extendido — a chamada recursiva a
 * `tx[model][operation]` cai de novo no mesmo hook (loop que só termina em
 * "Unable to start a transaction in the given time"). Com `rawClient`
 * isolado, `tx` nunca carrega extensão nenhuma e não há recursão possível.
 *
 * Sem tenant no contexto (rota @Public(), seed, scripts) a query roda direto
 * — RLS nessas tabelas simplesmente não deixa nenhuma linha passar sem
 * app.tenant_id configurado (ver AuthService, que por isso usa
 * PrismaBootstrapService — a role de owner, que ignora RLS — para suas
 * poucas consultas inerentemente cross-tenant).
 */
export function tenantRlsExtension(
  client: PrismaClient,
  rawClient: PrismaClient,
) {
  return client.$extends({
    name: 'tenant-rls',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantId = getCurrentTenantId();

          if (!tenantId || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          return rawClient.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;

            const delegateName = model.charAt(0).toLowerCase() + model.slice(1);
            const delegate = tx[
              delegateName as keyof typeof tx
            ] as unknown as Record<string, (args: unknown) => unknown>;

            return delegate[operation](args);
          });
        },
      },
    },
  });
}
