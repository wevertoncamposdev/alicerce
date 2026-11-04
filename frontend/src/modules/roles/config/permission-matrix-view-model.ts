// modules/roles/config/permission-matrix-view-model.ts
//
// Função pura (nem "use server" nem "use client") — usa `entityLabel`
// (core/registry/labels.ts, `server-only`), então só pode ser chamada de
// código que roda no servidor. Importada só por `roleService.ts`
// ('use server': toda chamada à API de permissões já passa por lá,
// então a tradução acontece ali, nunca em RolePermissionMatrix.tsx,
// que é "use client") — mesmo motivo de `modules/audit/config/
// row-view-model.ts` (U2), um nível acima (lá quem chama é um Server
// Component; aqui é uma Server Action).
import { entityLabel } from "@core/registry/labels";
import { permissionActionLabel } from "@modules/permissions/config/action-label";
import type { PermissionMatrixGroup } from "@modules/roles/actions/roleService";

// Ordem fixa (não alfabética) — "Ver" antes de "Criar" é a ordem natural
// de progressão de acesso; só entram colunas que o catálogo realmente usa.
const ACTION_ORDER = ["read", "create", "update", "delete", "manage", "assign"] as const;

export type MatrixCell = { permissionId: string; granted: boolean; description: string | null } | null;

export type MatrixRow = {
    resource: string;
    resourceLabel: string;
    cells: Record<string, MatrixCell>;
};

export type MatrixColumn = { action: string; label: string };

export type PermissionMatrixViewModel = {
    columns: MatrixColumn[];
    rows: MatrixRow[];
};

function actionOf(permissionName: string): string {
    return permissionName.split(".").pop() ?? permissionName;
}

export function toPermissionMatrixViewModel(groups: PermissionMatrixGroup[]): PermissionMatrixViewModel {
    const actionsPresent = new Set<string>();
    for (const group of groups) {
        for (const permission of group.permissions) {
            actionsPresent.add(actionOf(permission.name));
        }
    }

    const columns: MatrixColumn[] = ACTION_ORDER
        .filter((action) => actionsPresent.has(action))
        .map((action) => ({ action, label: permissionActionLabel(action) }));

    const rows: MatrixRow[] = groups.map((group) => {
        const cells: Record<string, MatrixCell> = {};
        for (const permission of group.permissions) {
            cells[actionOf(permission.name)] = {
                permissionId: permission.id,
                granted: permission.granted,
                description: permission.description,
            };
        }
        return {
            resource: group.resource,
            resourceLabel: entityLabel(group.resource),
            cells,
        };
    });

    return { columns, rows };
}
