import { apiServer } from "@lib/api-server";
import type { SearchResult } from "@core/data-provider/types";
import type { MeProfile } from "../types/types";

// "perfil" não é uma entidade com lista — é sempre o usuário autenticado
// (ver ADR 0009). `read`/`update` ignoram o id recebido e sempre resolvem
// para `/me`; nunca existe uma rota `/perfil/:id` de verdade.
export async function readMe(): Promise<MeProfile> {
    return apiServer.get<MeProfile>("me");
}

export async function updateMe(patch: Partial<MeProfile>): Promise<MeProfile> {
    return apiServer.patch<MeProfile>("me", patch);
}

// Stub exigido pelo contrato de RecordModuleDataHandlers — nunca
// exercitado, pois não existe rota de lista para "perfil".
export async function searchMeStub(): Promise<SearchResult<MeProfile>> {
    return { data: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } };
}
