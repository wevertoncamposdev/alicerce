// core/registry/labels.ts
//
// U2 (docs/PLAN-fundacao-ux.md, ADR 0014): ponto central de tradução
// técnico → português — nome de entidade, rótulo de campo e verbo de
// ação. Evita duplicar label em cada tela que precisa mostrar o mesmo
// módulo/campo em texto (auditoria, permissões, e o que mais precisar).
import "server-only";
import { getModule } from "@core/registry";
import { alicerceModules, alicerceTerms } from "@/alicerce.config";

// Entidades que nunca têm módulo em `alicerceModules` (não são um
// record module de verdade) — nome vindo de `resolveAuditEntityFromUrl`
// no backend (sempre singular, minúsculo).
const ENTITY_LABEL_FALLBACKS: Record<string, string> = {
    tenant: alicerceTerms.tenant,
    auth: "Autenticação",
    file: "Arquivo",
    me: "Perfil",
};

/**
 * Nome humano de uma entidade/recurso. Aceita tanto o singular minúsculo
 * que a auditoria grava (`resolveAuditEntityFromUrl`, backend — ex.:
 * "user") quanto o plural que o catálogo de permissões usa como
 * `resource` (ex.: "users") — ambos batem com a `key` de
 * `alicerceModules`, só muda se já vem no plural ou não.
 */
export function entityLabel(entity: string): string {
    const normalized = entity.toLowerCase();

    const direct = alicerceModules.find((m) => m.key === normalized);
    if (direct) return direct.title;

    const plural = normalized.endsWith("s") ? normalized : `${normalized}s`;
    const pluralized = alicerceModules.find((m) => m.key === plural);
    if (pluralized) return pluralized.title;

    if (ENTITY_LABEL_FALLBACKS[normalized]) return ENTITY_LABEL_FALLBACKS[normalized];

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// "tenantId" -> "Tenant Id" — só o último recurso, quando o campo nem
// está nos `formFields` do módulo (não deveria aparecer pro usuário,
// mas não pode quebrar a tela se acontecer).
function humanizeFieldName(field: string): string {
    const withSpaces = field.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

/**
 * Rótulo de um campo dentro de um módulo já registrado (`model` bate
 * com `defineRecordModule({ model })`). Só funciona para módulos reais
 * (passam por `getModule`, que exige registro em `bootstrap.ts`) — a
 * demo nunca aparece em auditoria, não precisa disso.
 */
export function fieldLabel(model: string, field: string): string {
    try {
        const mod = getModule(model);
        const found = mod.formFields.find((f) => f.name === field);
        if (found) return found.label;
    } catch {
        // módulo não registrado — cai no fallback abaixo
    }

    return humanizeFieldName(field);
}

const ACTION_LABELS: Record<string, string> = {
    POST: "Criou",
    PATCH: "Alterou",
    PUT: "Alterou",
    DELETE: "Removeu",
};

/** Verbo HTTP da auditoria (`action`, sempre maiúsculo) em português. */
export function actionLabel(action: string): string {
    return ACTION_LABELS[action.toUpperCase()] ?? action;
}
