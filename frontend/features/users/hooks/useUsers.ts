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

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await userService.list();
      setUsers(response.users);
      setTotal(response.total ?? response.users.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const createUser = useCallback(
    async (payload: Parameters<typeof userService.create>[0]) => {
      const response = await userService.create(payload);
      await loadUsers();
      return response;
    },
    [loadUsers],
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
