// features/users/hooks/useUsers.ts

"use client";

import { useCallback, useEffect, useState } from "react";
import { userService, type User } from "../services/userService";

type UseUsersState = {
  users: User[];
  loading: boolean;
  error: string | null;
  total: number;
};

export function useUsers(tenantId: string | null) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadUsers = useCallback(async () => {
    if (!tenantId) {
      setUsers([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await userService.list(tenantId);
      setUsers(response);
      setTotal(response.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const createUser = useCallback(
    async (payload: { email: string; password: string }) => {
      if (!tenantId) {
        throw new Error("Selecione um tenant antes de criar usuário.");
      }

      const response = await userService.create({ ...payload, tenantId });
      await loadUsers();
      return response;
    },
    [loadUsers, tenantId],
  );

  const updateUser = useCallback(
    async (id: string, payload: Parameters<typeof userService.update>[1]) => {
      const response = await userService.update(id, payload);
      await loadUsers();
      return response;
    },
    [loadUsers],
  );

  const deleteUser = useCallback(
    async (id: string) => {
      const response = await userService.remove(id);
      await loadUsers();
      return response;
    },
    [loadUsers],
  );

  return {
    users,
    total,
    loading,
    error,
    reload: loadUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}
