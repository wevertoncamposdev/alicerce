// lib/auth-server.ts
//
// Server-only: usa `next/headers` (via lib/session.ts) para ler o cookie de
// sessão e perguntar pro Nest "quem está logado". Serve como equivalente,
// para Server Components/Server Actions, do que `useAuth()` faz no client.
//
// `cache()` do React dedupe chamadas repetidas dentro da MESMA renderização
// (ex.: layout + page chamando getCurrentUser() não disparam 2 requests).
import "server-only";
import { cache } from "react";
import { getSessionTenantId, getSessionToken } from "@/lib/session";
import type { AuthUserProfile } from "@/features/auth/auth.service";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

export interface CurrentUser {
    user: AuthUserProfile;
    tenantId: string | null;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
    const token = await getSessionToken();

    if (!token) {
        return null;
    }

    const response = await fetch(`${INTERNAL_API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        // Sensível a sessão/role: nunca deve entrar no Data Cache do Next.
        cache: "no-store",
    });

    if (!response.ok) {
        return null;
    }

    const user = (await response.json()) as AuthUserProfile;
    const tenantId = await getSessionTenantId();

    return { user, tenantId };
});

export function hasPermission(currentUser: CurrentUser | null, permission: string): boolean {
    return Boolean(currentUser?.user.permissions?.includes(permission));
}

export function hasRole(currentUser: CurrentUser | null, role: string): boolean {
    return Boolean(currentUser?.user.roles?.includes(role));
}
