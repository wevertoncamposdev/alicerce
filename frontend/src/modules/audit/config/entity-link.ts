import { alicerceModules } from "@/alicerce.config";

// "Link pro registro afetado" (Plano Base.md 8.5) — só quando o módulo da
// entidade existe no registry E tem rota de detail (:id). `entity` é
// sempre singular (ver resolveAuditEntityFromUrl, backend) — módulos são
// registrados no plural, daí a pluralização ingênua abaixo; cobre todos os
// módulos atuais (user->users, role->roles, permission->permissions,
// feedback->feedbacks). Entidades sem módulo correspondente (tenant, auth,
// audit, file, me) voltam `null` — a UI mostra o id como texto simples.
export function resolveAuditEntityHref(entity: string, entityId: string | null): string | null {
    if (!entityId) return null;

    const candidateKey = entity.endsWith("s") ? entity : `${entity}s`;
    const mod = alicerceModules.find((m) => m.key === candidateKey);
    if (!mod) return null;

    return `${mod.basePath}/${entityId}`;
}
