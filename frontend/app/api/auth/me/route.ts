import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";

/**
 * GET /api/auth/me
 *
 * Usado pelo AuthContext ao carregar o app (F5, abrir nova aba) para saber
 * "quem está logado", sem nunca precisar que o navegador guarde o token.
 * O navegador manda o cookie automaticamente (mesma origem) -> este handler
 * lê o cookie -> monta Authorization: Bearer -> pergunta pro Nest.
 *
 * A lógica em si mora em lib/auth-server.ts (getCurrentUser), a mesma usada
 * por Server Components/Server Actions — este handler é só a versão exposta
 * como JSON para o AuthContext (client) consumir.
 */
export async function GET() {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user: currentUser.user, tenantId: currentUser.tenantId });
}