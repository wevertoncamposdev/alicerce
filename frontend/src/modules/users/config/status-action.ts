'use server';

import { apiServer } from "@lib/api-server";
import type { UserEntity } from "@modules/users/types/types";

// Status de usuário só aceita ACTIVE/INACTIVE (UpdateUserDto) — diferente
// do enum Status compartilhado (que tem SUSPENDED/ARCHIVED também, sem
// sentido aqui, ver ADR 0011 e Plano Base.md 7.4).
export async function updateUserStatus(userId: string, status: "ACTIVE" | "INACTIVE"): Promise<UserEntity> {
    return apiServer.patch<UserEntity>(`user/${userId}`, { status });
}
