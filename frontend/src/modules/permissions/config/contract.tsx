import { Shield } from "lucide-react";
import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, FormFieldConfig, ListLayout } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";

import { PermissionsListView } from "@modules/permissions/components/PermissionsListView";

import { searchPermissions, readPermission, readPermissionRoles } from "./provider";
import type { PermissionEntity, ContextItem } from "../types/types";
import PermissionRolesHost from "@modules/permissions/components/PermissionRolesHost";
import { permissionActionLabel } from "@modules/permissions/config/action-label";
import { entityLabel } from "@core/registry/labels";

// Somente leitura (Plano Base.md 8.4) — sem create/update/delete em
// dataHandlers, então nenhum botão de criar/editar/excluir pode aparecer.
// `formFields` ainda existe só pra dar label/tipo de exibição ao FieldList
// da seção "Dados" (nenhuma seção é `editable`, então nunca vira um FormView).
const formFields: FormFieldConfig<PermissionEntity>[] = [
    { name: "name", label: "Nome", type: "text" },
    { name: "type", label: "Tipo", type: "text" },
    { name: "resource", label: "Recurso", type: "text" },
    { name: "description", label: "Descrição", type: "textarea" },
];

const { parseListState, serializeListState } = createListQueryState();

const permissionsListLayout: ListLayout<PermissionEntity> = {
    // `entityLabel` é `server-only` — não pode rodar dentro de
    // PermissionsListView.tsx ("use client"); mesmo motivo de
    // `modules/audit/config/row-view-model.ts`, traduzido aqui antes de
    // descer como prop.
    list: ({ data }) => (
        <PermissionsListView
            data={data.map((permission) => ({
                ...permission,
                resourceLabel: entityLabel(permission.resource ?? "outros"),
                actionText: permissionActionLabel(permission.name),
            }))}
        />
    ),
};

const permissionsDetailLayout: DetailLayout<PermissionEntity> = {
    header: ({ record }) => ({
        title: record.name,
        subtitle: record.description ? [record.description] : [],
    }),
    sections: [
        {
            key: "dados",
            title: "Dados",
            icon: Shield,
            column: 1,
            fields: ["name", "type", "resource", "description"],
        },
    ],
    relations: ({ record }) => [
        { key: "roles", label: "Papéis", content: <PermissionRolesSection permissionId={record.id} /> },
    ],
};

async function PermissionRolesSection({ permissionId }: { permissionId: string }) {
    const roles = await readPermissionRoles(permissionId);
    return <PermissionRolesHost items={roles ?? []} />;
}

function loadPermissionContext(record: PermissionEntity): ContextItem[] {
    return [
        { key: "createdAt", label: "Criado em", value: record.createdAt?.slice?.(0, 16).replace("T", ", ") ?? "" },
    ];
}

export const permissionsModule = defineRecordModule<PermissionEntity>({
    model: "permissions",
    label: "Permissões",
    views: ["list"],
    defaultView: "list",
    dataHandlers: { search: searchPermissions, read: readPermission },
    formFields,
    parseListState,
    serializeListState,
    listLayout: permissionsListLayout,
    detailLayout: permissionsDetailLayout,
    detailConfig: { auditEnabled: true, loadContext: loadPermissionContext },
});

registerModule(permissionsModule);
