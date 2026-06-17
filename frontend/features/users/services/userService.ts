import { apiRequest } from '@/lib/api-client';
import { UserEntity, UserPayload, UserUpdatePayload } from '../user.types';

export interface FetchUsersParams {
  token: string;
  tenantId: string;
}

export interface CreateUserParams {
  token: string;
  payload: UserPayload;
}

export interface UpdateUserParams {
  token: string;
  userId: string;
  payload: UserUpdatePayload;
}

export interface RemoveUserParams {
  token: string;
  userId: string;
}

export async function fetchUsers(params: FetchUsersParams): Promise<UserEntity[]> {
  return apiRequest<UserEntity[]>(`/user?tenantId=${params.tenantId}`, {
    method: 'GET',
    token: params.token,
  });
}

export async function createUser(params: CreateUserParams): Promise<UserEntity> {
  return apiRequest<UserEntity>('/user', {
    method: 'POST',
    token: params.token,
    body: params.payload,
  });
}

export async function updateUser(params: UpdateUserParams): Promise<UserEntity> {
  return apiRequest<UserEntity>(`/user/${params.userId}`, {
    method: 'PATCH',
    token: params.token,
    body: params.payload,
  });
}

export async function removeUser(params: RemoveUserParams): Promise<null> {
  return apiRequest<null>(`/user/${params.userId}`, {
    method: 'DELETE',
    token: params.token,
  });
}
