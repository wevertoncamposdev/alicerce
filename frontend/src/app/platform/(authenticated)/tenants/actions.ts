'use server';

import { revalidatePath } from "next/cache";
import { platformApiServer } from "@lib/platform-api-server";

export async function updateTenantStatusAction(formData: FormData) {
    const tenantId = String(formData.get("tenantId") ?? "");
    const status = String(formData.get("status") ?? "");

    await platformApiServer.patch(`management/tenants/${tenantId}/status`, { status });

    // Não é autosave (AGENTS §4.1.8 fala só de autosave) — uma ação pontual
    // de management pode e deve revalidar a lista pra refletir o novo status.
    revalidatePath("/platform/tenants");
}
