import { apiClient } from "@/lib/api-client";
import { AuditEntry } from "../audit.types";

// Nota: autenticação agora é via cookie httpOnly (lida pelo proxy em
// /api/proxy), então não é mais necessário receber/repassar `token`.
export interface FetchAuditEntriesParams {
    tenantId: string;
}

export async function fetchAuditEntries(params: FetchAuditEntriesParams): Promise<AuditEntry[]> {
    return apiClient.get<AuditEntry[]>(`tenant/${params.tenantId}/audit`);
}
