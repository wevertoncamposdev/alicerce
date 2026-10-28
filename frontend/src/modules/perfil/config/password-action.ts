'use server';

import { apiServer } from "@lib/api-server";
import { getRefreshToken } from "@lib/session";

// POST /me/password precisa do cookie de refresh token pra revogar as
// outras sessões preservando a atual — apiServer só envia o Bearer por
// padrão, então repassamos o cookie manualmente (ver api-server.ts).
export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
    const refreshToken = await getRefreshToken();

    await apiServer.post(
        "me/password",
        { currentPassword, newPassword },
        { headers: refreshToken ? { Cookie: `refresh_token=${refreshToken}` } : undefined },
    );
}
