// core/registry/entity-link.ts
//
// U6 (docs/PLAN-fundacao-ux.md, ADR 0014): link pro registro citado no
// Histórico do drawer de metadados. Mesma lógica de
// `modules/audit/config/entity-link.ts#resolveAuditEntityHref` — não dá
// pra importar de lá (core/ nunca importa de modules/, AGENTS.md §4.4),
// então esta é a versão própria do core, pequena o bastante pra não valer
// a pena virar abstração compartilhada.
import { alicerceModules } from "@/alicerce.config";

/**
 * `entity` é sempre singular, minúsculo (mesmo valor que o backend grava
 * em `Audit.entity`/`Note.entity`/`RecordTag.entity` — ver
 * `resolveAuditEntityFromUrl` no backend). Entidade sem módulo
 * correspondente (tenant, auth, file, me) devolve `null` — quem chama
 * mostra o id como texto simples nesse caso.
 */
export function resolveRecordHref(entity: string, entityId: string | null | undefined): string | null {
    if (!entityId) return null;

    const candidateKey = entity.endsWith("s") ? entity : `${entity}s`;
    const mod = alicerceModules.find((m) => m.key === candidateKey);
    if (!mod) return null;

    return `${mod.basePath}/${entityId}`;
}
