import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { RoleEntity, RolePayload } from '../role.types';
import {
    attachRolePermission,
    attachRoleUser,
    createRole,
    fetchRoles,
    removeRole,
    updateRole,
} from '../services/roleService';
import { toErrorMessage } from '@/types/api';
import { AsyncError } from '@/types/async-state';

export interface UseRolesResult {
    roles: RoleEntity[];
    loading: boolean;
    saving: boolean;
    error: AsyncError;
    createRole: (payload: Omit<RolePayload, 'tenantId'>) => Promise<void>;
    updateRole: (roleId: string, payload: Partial<RolePayload>) => Promise<void>;
    removeRole: (roleId: string) => Promise<void>;
    assignUser: (roleId: string, userId: string) => Promise<void>;
    assignPermission: (roleId: string, permissionId: string) => Promise<void>;
    reload: () => Promise<void>;
}

export function useRoles(): UseRolesResult {
    const { token, currentTenantId } = useAuth();
    const [roles, setRoles] = useState<RoleEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!token || !currentTenantId) {
            setRoles([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await fetchRoles({ token, tenantId: currentTenantId });
            setRoles(data);
        } catch (err) {
            setError(toErrorMessage(err, 'Falha ao carregar papeis.'));
        } finally {
            setLoading(false);
        }
    }, [token, currentTenantId]);

    useEffect(() => {
        void load();
    }, [load]);

    const create = useCallback(async (payload: Omit<RolePayload, 'tenantId'>) => {
        if (!token || !currentTenantId) {
            throw new Error('Sessao ou tenant nao definido.');
        }

        setSaving(true);
        setError(null);

        try {
            const created = await createRole({
                token,
                payload: { ...payload, tenantId: currentTenantId },
            });
            setRoles((prev) => [created, ...prev]);
        } catch (err) {
            const message = toErrorMessage(err, 'Falha ao criar papel.');
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, [token, currentTenantId]);

    const update = useCallback(async (roleId: string, payload: Partial<RolePayload>) => {
        if (!token) {
            throw new Error('Sessao nao definida.');
        }

        setSaving(true);
        setError(null);

        try {
            const updated = await updateRole({ token, roleId, payload });
            setRoles((prev) => prev.map((role) => (role.id === roleId ? updated : role)));
        } catch (err) {
            const message = toErrorMessage(err, 'Falha ao atualizar papel.');
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, [token]);

    const remove = useCallback(async (roleId: string) => {
        if (!token) {
            throw new Error('Sessao nao definida.');
        }

        setSaving(true);
        setError(null);

        try {
            await removeRole({ token, roleId });
            setRoles((prev) => prev.filter((role) => role.id !== roleId));
        } catch (err) {
            const message = toErrorMessage(err, 'Falha ao remover papel.');
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, [token]);

    const assignUser = useCallback(async (roleId: string, userId: string) => {
        if (!token || !currentTenantId) {
            throw new Error('Sessao ou tenant nao definido.');
        }

        setSaving(true);
        setError(null);

        try {
            await attachRoleUser({ token, roleId, tenantId: currentTenantId, userId });
            await load();
        } catch (err) {
            const message = toErrorMessage(err, 'Falha ao vincular usuario ao papel.');
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, [token, currentTenantId]);

    const assignPermission = useCallback(async (roleId: string, permissionId: string) => {
        if (!token || !currentTenantId) {
            throw new Error('Sessao ou tenant nao definido.');
        }

        setSaving(true);
        setError(null);

        try {
            await attachRolePermission({
                token,
                roleId,
                tenantId: currentTenantId,
                permissionId,
            });
            await load();
        } catch (err) {
            const message = toErrorMessage(err, 'Falha ao vincular permissao ao papel.');
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, [token, currentTenantId]);

    return {
        roles,
        loading,
        saving,
        error,
        createRole: create,
        updateRole: update,
        removeRole: remove,
        assignUser,
        assignPermission,
        reload: load,
    };
}
