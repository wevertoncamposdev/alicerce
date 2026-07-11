import { useCallback, useEffect, useState } from "react";
import { AuditEntry } from "../audit.types";
import { fetchAuditEntries } from "../services/auditService";
import { toErrorMessage } from "@/types/api";
import { AsyncError } from "@/types/async-state";

interface UseAuditParams {
    tenantId: string | null;
}

export interface UseAuditResult {
    entries: AuditEntry[];
    loading: boolean;
    saving: boolean;
    error: AsyncError;
    reload: () => Promise<void>;
}

export function useAudit({ tenantId }: UseAuditParams): UseAuditResult {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!tenantId) {
            setEntries([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await fetchAuditEntries({ tenantId });
            setEntries(data);
        } catch (err) {
            setError(toErrorMessage(err, "Falha ao carregar auditoria."));
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        void load();
    }, [load]);

    return {
        entries,
        loading,
        saving,
        error,
        reload: load,
    };
}
