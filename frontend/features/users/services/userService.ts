// features/users/services/userService.ts

import { apiClient } from "@/lib/api-client";

export type User = {
  id: string;
  name: string;
  email: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role?: string;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
};

export type GetUsersResponse = {
  users: User[];
  total?: number;
};

export const userService = {
  list: async () => {
    return apiClient.get<GetUsersResponse>("main/users");
  },

  getById: async (id: string) => {
    return apiClient.get<{ user: User }>(`main/users/${id}`);
  },

  create: async (payload: CreateUserInput) => {
    return apiClient.post<{ user: User }>("main/users", payload);
  },

  update: async (id: string, payload: UpdateUserInput) => {
    return apiClient.patch<{ user: User }>(`main/users/${id}`, payload);
  },

  remove: async (id: string) => {
    return apiClient.delete<{ success: boolean }>(`main/users/${id}`);
  },
};
