import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
    createTenant,
    fetchTenants,
    removeTenant,
    updateTenant,
} from "../services/tenantService";
import { Tenant, TenantPayload } from "../tenant.types";
import { toErrorMessage } from "@/types/api";
import { AsyncError } from "@/types/async-state";

export interface UseTenantsResult {
    tenants: Tenant[];
    loading: boolean;
    saving: boolean;
    error: AsyncError;
    createTenant: (payload: TenantPayload) => Promise<void>;
    updateTenant: (id: string, payload: TenantPayload) => Promise<void>;
    removeTenant: (id: string) => Promise<void>;
    reload: () => Promise<void>;
}

export function useTenants(): UseTenantsResult {
    const { token, currentTenantId } = useAuth();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        void fetchTenants({
            token,
            tenantId: currentTenantId ?? undefined,
        })
            .then((data) => {
                if (cancelled) {
                    return;
                }

                setTenants(data);
            })
            .catch((err) => {
                if (cancelled) {
                    return;
                }

                setError(toErrorMessage(err, "Nao foi possivel carregar os tenants."));
            })
            .finally(() => {
                if (cancelled) {
                    return;
                }

                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [token, currentTenantId]);

    const loadTenants = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await fetchTenants({
                token,
                tenantId: currentTenantId ?? undefined,
            });
            setTenants(data);
        } catch (err) {
            setError(toErrorMessage(err, "Nao foi possivel carregar os tenants."));
        } finally {
            setLoading(false);
        }
    }, [token, currentTenantId]);

    const handleCreateTenant = useCallback(async (payload: TenantPayload) => {
        setSaving(true);
        setError(null);

        try {
            const created = await createTenant(payload, {
                token,
                tenantId: currentTenantId ?? undefined,
            });
            setTenants((prev) => [created, ...prev]);
        } catch (err) {
            const message = toErrorMessage(err, "Falha ao criar tenant.");
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, [token, currentTenantId]);

    const handleUpdateTenant = useCallback(async (id: string, payload: TenantPayload) => {
        setSaving(true);
        setError(null);

        try {
            const updated = await updateTenant(id, payload, {
                token,
                tenantId: currentTenantId ?? undefined,
            });
            setTenants((prev) =>
                prev.map((tenant) => (tenant.id === id ? updated : tenant)),
            );
        } catch (err) {
            const message = toErrorMessage(err, "Falha ao atualizar tenant.");
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, [token, currentTenantId]);

    const handleRemoveTenant = useCallback(async (id: string) => {
        setSaving(true);
        setError(null);

        try {
            await removeTenant(id, {
                token,
                tenantId: currentTenantId ?? undefined,
            });
            setTenants((prev) => prev.filter((tenant) => tenant.id !== id));
        } catch (err) {
            const message = toErrorMessage(err, "Falha ao remover tenant.");
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, [token, currentTenantId]);

    return {
        tenants,
        loading,
        saving,
        error,
        createTenant: handleCreateTenant,
        updateTenant: handleUpdateTenant,
        removeTenant: handleRemoveTenant,
        reload: loadTenants,
    };
}
