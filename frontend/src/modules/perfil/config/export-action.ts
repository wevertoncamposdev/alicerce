'use server';

import { apiServer } from "@lib/api-server";
import type { MeExport } from "../types/types";

// GET /me/export (etapa 9.2, LGPD) — mesmo padrão de sessions-provider.ts.
export async function exportMyDataAction(): Promise<MeExport> {
    return apiServer.get<MeExport>("me/export");
}
