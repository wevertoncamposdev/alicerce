// alicerce.config.ts
//
// Registro único por módulo de domínio — substitui as edições manuais que
// antes ficavam dispersas (PLAN.md, Etapa 7.F): `lib/authz.ts` (rotas +
// permissões de ação), `core/components/Layout/AppSidebar.tsx` (ícone +
// agrupamento no menu). `bootstrap.ts` continua com a lista de imports
// explícita — Next.js/Turbopack precisa de caminhos de import estáticos
// pro code-splitting funcionar, não dá pra tornar isso dinâmico a partir
// de dado de config sem arriscar quebrar o bundling.
import type { LucideIcon } from "lucide-react";
import { Users, Star, Building2, KeyRound, Shield, FileText } from "lucide-react";

export type ModuleManifestEntry = {
    /** Bate com o `model` de `defineRecordModule` e com o resource da API. */
    key: string;
    /** Label exibido no menu lateral — já acentuado corretamente. */
    title: string;
    icon: LucideIcon;
    /** Prefixo de rota (`app/(app)/<key>/...`). */
    basePath: string;
    /** Permissão exigida pra ver/acessar o módulo (checagem de leitura). */
    permission: string;
    /** Em qual grupo do menu lateral o módulo aparece. */
    navGroup: "geral" | "permissoes";
    /**
     * Permissões por ação granular (criar/editar/remover/...), além da
     * permissão de leitura acima. Chave vira `${key}.${ação}` em
     * `AuthAction` (ver lib/authz.ts).
     */
    actionPermissions?: Record<string, string>;
};

export function defineModuleManifest<const T extends readonly ModuleManifestEntry[]>(entries: T): T {
    return entries;
}

export const alicerceModules = defineModuleManifest([
    {
        key: "users",
        title: "Usuários",
        icon: Users,
        basePath: "/users",
        permission: "user.read",
        navGroup: "geral",
        actionPermissions: { create: "user.create", update: "user.update", delete: "user.delete" },
    },
    {
        key: "tenants",
        title: "Tenants",
        icon: Building2,
        basePath: "/tenants",
        permission: "tenant.read",
        navGroup: "geral",
        actionPermissions: { create: "tenant.update", update: "tenant.update", delete: "tenant.update" },
    },
    {
        key: "favorites",
        title: "Favoritos",
        icon: Star,
        basePath: "/favorites",
        permission: "user.read",
        navGroup: "permissoes",
        actionPermissions: {},
    },
    {
        key: "roles",
        title: "Papéis",
        icon: KeyRound,
        basePath: "/roles",
        permission: "role.read",
        navGroup: "permissoes",
        actionPermissions: { create: "role.create", update: "role.update", delete: "role.delete", assign: "role.assign" },
    },
    {
        key: "permissions",
        title: "Permissões",
        icon: Shield,
        basePath: "/permissions",
        permission: "permission.read",
        navGroup: "permissoes",
        actionPermissions: { create: "permission.create", update: "permission.update", delete: "permission.delete" },
    },
    {
        key: "audit",
        title: "Auditoria",
        icon: FileText,
        basePath: "/audit",
        permission: "audit.read",
        navGroup: "permissoes",
        actionPermissions: { refresh: "audit.read" },
    },
] as const);
