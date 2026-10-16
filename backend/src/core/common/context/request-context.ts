import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextStore {
  tenantId: string;
  // Evita reabrir uma 2ª transação quando a extension do Prisma
  // (tenant-rls.extension.ts) já abriu uma para a operação em curso — ver
  // comentário em TENANT_SCOPED_MODELS.$allOperations.
  insideTenantTx?: boolean;
}

export const requestContextStorage =
  new AsyncLocalStorage<RequestContextStore>();

export function getCurrentTenantId(): string | undefined {
  return requestContextStorage.getStore()?.tenantId;
}

/**
 * Para código que roda ANTES do `RequestContextInterceptor` (guards —
 * ver o comentário desse interceptor: "guards vêm antes de interceptors no
 * pipeline do Nest") e precisa de uma query tenant-scoped de verdade. Sem
 * isto, a extension de RLS do Prisma (tenant-rls.extension.ts) não acha
 * `tenantId` no contexto, trata a query como "sem tenant" e não seta
 * `app.tenant_id` — a policy do Postgres então filtra TODAS as linhas (bug
 * real encontrado via smoke test manual na Etapa 7.D: `RolesPermissionsGuard`
 * chama `PermissionCacheService.reloadPermissions`, que caiu exatamente
 * nesse buraco sempre que o cache do Redis está frio).
 */
export function runWithTenantContext<T>(
  tenantId: string,
  fn: () => Promise<T>,
): Promise<T> {
  // Precisa ser um `new Promise` com um callback `async` passado a `.run()`
  // (mesmo padrão de RequestContextInterceptor, pelo mesmo motivo: uma
  // arrow SÍNCRONA que só retorna/dispara uma Promise perde a propagação do
  // contexto do AsyncLocalStorage para a extension de RLS do Prisma, que
  // roda bem mais abaixo na cadeia de `await`s — confirmado empiricamente
  // comparando os dois padrões lado a lado contra o Postgres real).
  return new Promise((resolve, reject) => {
    void requestContextStorage.run({ tenantId }, async () => {
      try {
        resolve(await fn());
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}
