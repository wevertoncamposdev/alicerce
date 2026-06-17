import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  createUser,
  fetchUsers,
  removeUser,
  updateUser,
} from '../services/userService';
import { UserEntity, UserPayload, UserUpdatePayload } from '../user.types';
import { toErrorMessage } from '@/types/api';
import { AsyncError } from '@/types/async-state';

export interface UseUsersResult {
  users: UserEntity[];
  loading: boolean;
  saving: boolean;
  error: AsyncError;
  createUser: (payload: Omit<UserPayload, 'tenantId'>) => Promise<void>;
  updateUser: (id: string, payload: UserUpdatePayload) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useUsers(): UseUsersResult {
  const { token, currentTenantId } = useAuth();
  const [users, setUsers] = useState<UserEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!token || !currentTenantId) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchUsers({ token, tenantId: currentTenantId });
      setUsers(data);
    } catch (err) {
      setError(toErrorMessage(err, 'Falha ao carregar usuarios.'));
    } finally {
      setLoading(false);
    }
  }, [token, currentTenantId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleCreateUser = useCallback(async (payload: Omit<UserPayload, 'tenantId'>) => {
    if (!token || !currentTenantId) {
      throw new Error('Sessao ou tenant nao definido.');
    }

    setSaving(true);
    setError(null);

    try {
      const created = await createUser({
        token,
        payload: {
          ...payload,
          tenantId: currentTenantId,
        },
      });
      setUsers((prev) => [created, ...prev]);
    } catch (err) {
      const message = toErrorMessage(err, 'Falha ao criar usuario.');
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, [token, currentTenantId]);

  const handleUpdateUser = useCallback(async (id: string, payload: UserUpdatePayload) => {
    if (!token) {
      throw new Error('Sessao nao definida.');
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await updateUser({ token, userId: id, payload });
      setUsers((prev) => prev.map((user) => (user.id === id ? updated : user)));
    } catch (err) {
      const message = toErrorMessage(err, 'Falha ao atualizar usuario.');
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, [token]);

  const handleRemoveUser = useCallback(async (id: string) => {
    if (!token) {
      throw new Error('Sessao nao definida.');
    }

    setSaving(true);
    setError(null);

    try {
      await removeUser({ token, userId: id });
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (err) {
      const message = toErrorMessage(err, 'Falha ao remover usuario.');
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, [token]);

  return {
    users,
    loading,
    saving,
    error,
    createUser: handleCreateUser,
    updateUser: handleUpdateUser,
    removeUser: handleRemoveUser,
    reload: loadUsers,
  };
}
