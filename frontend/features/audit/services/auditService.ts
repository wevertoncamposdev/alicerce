import { apiRequest } from "@/lib/api-client";
import { AuditEntry } from "../audit.types";

export interface FetchAuditEntriesParams {
    tenantId: string;
    token: string;
}

export async function fetchAuditEntries(params: FetchAuditEntriesParams): Promise<AuditEntry[]> {
    const { tenantId, token } = params;

    return apiRequest<AuditEntry[]>(`/tenant/${tenantId}/audit`, {
        method: "GET",
        token,
    });
}
