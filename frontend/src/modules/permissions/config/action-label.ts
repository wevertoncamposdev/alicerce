// modules/permissions/config/action-label.ts
//
// U2 (docs/PLAN-fundacao-ux.md): `permission.name` é sempre
// `<recurso>.<ação>` (AGENTS.md §4.2.6, `permission-catalog.ts`
// backend) — pega só o sufixo e traduz pro texto principal da linha;
// `name` cru vira texto auxiliar pequeno, não desaparece.
const ACTION_LABELS: Record<string, string> = {
    create: "Criar",
    read: "Ver",
    update: "Editar",
    delete: "Remover",
    manage: "Gerenciar",
    assign: "Atribuir",
};

export function permissionActionLabel(name: string): string {
    const suffix = name.split(".").pop() ?? name;
    return ACTION_LABELS[suffix] ?? suffix;
}
