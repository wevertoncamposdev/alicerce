// features/users/services/userService.ts

import { apiClient } from "@lib/api-client";

export type User = {
  id: string;
  name: string | null;
  email: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateUserInput = {
  tenantId: string;
  email: string;
  password: string;
};

export type UpdateUserInput = {
  email?: string;
  password?: string;
};

export type GetUsersResponse = {
  users: User[];
  total?: number;
};

export const userService = {
  list: async (tenantId?: string) => {
    const path = tenantId ? `user?tenantId=${tenantId}` : "user";
    return apiClient.get<User[]>(path);
  },

  getById: async (id: string) => {
    return apiClient.get<User>(`user/${id}`);
  },

  create: async (payload: CreateUserInput) => {
    return apiClient.post<User>("user", payload);
  },

  update: async (id: string, payload: UpdateUserInput) => {
    return apiClient.patch<User>(`user/${id}`, payload);
  },

  remove: async (id: string) => {
    return apiClient.delete<{ success: boolean }>(`user/${id}`);
  },
};
