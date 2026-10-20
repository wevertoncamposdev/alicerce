'use server';

import { apiServer } from "@lib/api-server";
import { deleteUser } from "./provider";

export async function resendInvite(userId: string): Promise<void> {
    await apiServer.post(`user/${userId}/invite/resend`, {});
}

// "Cancelar convite" é só remover um usuário sem senha — reaproveita o
// delete genérico que já existe, sem endpoint novo (Plano Base.md 7.4).
export async function cancelInvite(userId: string): Promise<void> {
    await deleteUser(userId);
}
