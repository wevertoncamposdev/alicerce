// lib/data-provider/rest/audit.ts (novo arquivo — não é um "data provider" formal, ver decisão 4.3)
import 'server-only';
import { apiServer } from '@lib/api-server';
import { getSessionTenantId } from '@lib/session';


export type AuditEntry = {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    before: string | null;
    after: string | null;
    createdAt: string;
    userId: string;
    user: {
        id: string;
        email: string;
    };
    tenant: {
        id: string;
        legalName: string;
    }
};

export async function getEntityAuditTrail(entity: string, entityId: string): Promise<AuditEntry[]> {
    const tenantId = await getSessionTenantId();

    if (!tenantId) {
        throw new Error('Tenant não encontrado na sessão.');
    }

    return apiServer.get<AuditEntry[]>(`tenant/${tenantId}/audit`, {
        query: { entity, entityId },
    });
}