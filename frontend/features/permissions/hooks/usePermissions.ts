import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PermissionEntity, PermissionPayload } from '../permission.types';
import {
    createPermission,
    fetchPermissions,
    removePermission,
    updatePermission,
} from '../services/permissionService';
import { toErrorMessage } from '@/types/api';
import { AsyncError } from '@/types/async-state';

export interface UsePermissionsResult {
    permissions: PermissionEntity[];
    loading: boolean;
    saving: boolean;
    error: AsyncError;
    createPermission: (payload: Omit<PermissionPayload, 'tenantId'>) => Promise<void>;
    updatePermission: (permissionId: string, payload: Partial<PermissionPayload>) => Promise<void>;
    removePermission: (permissionId: string) => Promise<void>;
    reload: () => Promise<void>;
}

export function usePermissions(): UsePermissionsResult {
    const { token, currentTenantId } = useAuth();
    const [permissions, setPermissions] = useState<PermissionEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!token || !currentTenantId) {
            setPermissions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await fetchPermissions({ token, tenantId: currentTenantId });
            setPermissions(data);
        } catch (err) {
            setError(toErrorMessage(err, 'Falha ao carregar permissoes.'));
        } finally {
            setLoading(false);
        }
    }, [token, currentTenantId]);

    useEffect(() => {
        void load();
    }, [load]);

    const create = useCallback(async (payload: Omit<PermissionPayload, 'tenantId'>) => {
        if (!token || !currentTenantId) {
            throw new Error('Sessao ou tenant nao definido.');
        }

        setSaving(true);
        setError(null);

        try {
            const created = await createPermission({
                token,
                payload: { ...payload, tenantId: currentTenantId },
            });
            setPermissions((prev) => [created, ...prev]);
        } catch (err) {
            const message = toErrorMessage(err, 'Falha ao criar permissao.');
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, [token, currentTenantId]);

    const update = useCallback(async (permissionId: string, payload: Partial<PermissionPayload>) => {
        if (!token) {
            throw new Error('Sessao nao definida.');
        }

        setSaving(true);
        setError(null);

        try {
            const updated = await updatePermission({ token, permissionId, payload });
            setPermissions((prev) =>
                prev.map((permission) => (permission.id === permissionId ? updated : permission)),
            );
        } catch (err) {
            const message = toErrorMessage(err, 'Falha ao atualizar permissao.');
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, [token]);

    const remove = useCallback(async (permissionId: string) => {
        if (!token) {
            throw new Error('Sessao nao definida.');
        }

        setSaving(true);
        setError(null);

        try {
            await removePermission({ token, permissionId });
            setPermissions((prev) => prev.filter((permission) => permission.id !== permissionId));
        } catch (err) {
            const message = toErrorMessage(err, 'Falha ao remover permissao.');
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, [token]);

    return {
        permissions,
        loading,
        saving,
        error,
        createPermission: create,
        updatePermission: update,
        removePermission: remove,
        reload: load,
    };
}
