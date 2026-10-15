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
