"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { canAccessRoute, resolveRoutePermission } from "@/lib/authz";
import type { AuthUserProfile } from "@/lib/auth-types";

export function AppAccessGuard({
    currentUser,
    children,
}: {
    currentUser: AuthUserProfile;
    children: ReactNode;
}) {
    const pathname = usePathname();
    const isAllowed = canAccessRoute(pathname, currentUser.permissions ?? []);

    if (!isAllowed) {
        const requiredPermission = resolveRoutePermission(pathname);

        return (
            <main className="flex-1 p-6">
                <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Acesso negado. Permissão obrigatória: {requiredPermission ?? "desconhecida"}.
                </div>
            </main>
        );
    }

    return <>{children}</>;
}
