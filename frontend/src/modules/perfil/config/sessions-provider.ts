'use server';

import { apiServer } from "@lib/api-server";
import { getRefreshToken } from "@lib/session";
import type { MeSession } from "../types/types";

function cookieHeader(refreshToken: string | null) {
    return refreshToken ? { Cookie: `refresh_token=${refreshToken}` } : undefined;
}

// GET /me/sessions também precisa do cookie — é como o backend sabe qual
// das sessões listadas é "a atual" (isCurrent). Sem o cookie, a lista ainda
// funciona, só nenhuma linha vem marcada como atual.
export async function listMySessions(): Promise<MeSession[]> {
    const refreshToken = await getRefreshToken();
    return apiServer.get<MeSession[]>("me/sessions", { headers: cookieHeader(refreshToken) });
}

export async function revokeSessionAction(familyId: string): Promise<void> {
    const refreshToken = await getRefreshToken();
    await apiServer.delete(`me/sessions/${familyId}`, { headers: cookieHeader(refreshToken) });
}
