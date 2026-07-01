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
    const { currentTenantId } = useAuth();
    const [roles, setRoles] = useState<RoleEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!currentTenantId) {
            setRoles([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await fetchRoles({ tenantId: currentTenantId });
            setRoles(data);
        } catch (err) {
            setError(toErrorMessage(err, 'Falha ao carregar papeis.'));
        } finally {
            setLoading(false);
        }
    }, [currentTenantId]);

    useEffect(() => {
        void load();
    }, [load]);

    const create = useCallback(async (payload: Omit<RolePayload, 'tenantId'>) => {
        if (!currentTenantId) {
            throw new Error('Tenant nao definido.');
        }

        setSaving(true);
        setError(null);

        try {
            const created = await createRole({ ...payload, tenantId: currentTenantId });
            setRoles((prev) => [created, ...prev]);
        } catch (err) {
            const message = toErrorMessage(err, 'Falha ao criar papel.');
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, [currentTenantId]);

    const update = useCallback(async (roleId: string, payload: Partial<RolePayload>) => {
        setSaving(true);
        setError(null);

        try {
            const updated = await updateRole({ roleId, payload });
            setRoles((prev) => prev.map((role) => (role.id === roleId ? updated : role)));
        } catch (err) {
            const message = toErrorMessage(err, 'Falha ao atualizar papel.');
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, []);

    const remove = useCallback(async (roleId: string) => {
        setSaving(true);
        setError(null);

        try {
            await removeRole({ roleId });
            setRoles((prev) => prev.filter((role) => role.id !== roleId));
        } catch (err) {
            const message = toErrorMessage(err, 'Falha ao remover papel.');
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, []);

    const assignUser = useCallback(async (roleId: string, userId: string) => {
        if (!currentTenantId) {
            throw new Error('Tenant nao definido.');
        }

        setSaving(true);
        setError(null);

        try {
            await attachRoleUser({ roleId, tenantId: currentTenantId, userId });
            await load();
        } catch (err) {
            const message = toErrorMessage(err, 'Falha ao vincular usuario ao papel.');
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, [currentTenantId, load]);

    const assignPermission = useCallback(async (roleId: string, permissionId: string) => {
        if (!currentTenantId) {
            throw new Error('Tenant nao definido.');
        }

        setSaving(true);
        setError(null);

        try {
            await attachRolePermission({
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
    }, [currentTenantId, load]);

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
