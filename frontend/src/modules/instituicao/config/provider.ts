import { apiServer } from "@lib/api-server";
import type { SearchResult } from "@core/data-provider/types";
import type { TenantProfile } from "../types/types";

// "instituicao" não é uma entidade com lista — é sempre o próprio tenant
// do token (ver backend TenantController.getCurrent/updateCurrent, Plano
// Base.md 5.2). `read`/`update` ignoram o id recebido e sempre resolvem
// para `/tenant/current`.
export async function readCurrentTenant(): Promise<TenantProfile> {
    return apiServer.get<TenantProfile>("tenant/current");
}

export async function updateCurrentTenant(patch: Partial<TenantProfile>): Promise<TenantProfile> {
    return apiServer.patch<TenantProfile>("tenant/current", patch);
}

// Stub exigido pelo contrato de RecordModuleDataHandlers — nunca
// exercitado, pois não existe rota de lista para "instituicao".
export async function searchCurrentTenantStub(): Promise<SearchResult<TenantProfile>> {
    return { data: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } };
}
