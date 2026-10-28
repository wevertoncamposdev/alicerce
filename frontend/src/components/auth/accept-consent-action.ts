'use server';

import { apiServer } from "@lib/api-server";

// POST /me/consent — aceite dos termos quando a versão atual muda (etapa
// 9.1, LGPD). Mesmo padrão de modules/perfil/config/password-action.ts.
export async function acceptCurrentTerms(): Promise<void> {
    await apiServer.post("me/consent");
}
