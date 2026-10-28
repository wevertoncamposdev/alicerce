import { KeyRound } from "lucide-react";
import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, ListLayout } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { createRecordFormAction } from "@core/registry/actions";
import { Badge } from "@components/ui/badge";
import { STATUS_BADGE_CLASSNAME } from "@core/components/DetailView/statusBadgeClasses";

import { RolesListView } from "@modules/roles/components/RoleListView";
import { FormView } from "@components/TypeView/FormView/FormView";
import RoleUsersHost from "@modules/roles/components/RoleUsersHost";
import { RolePermissionMatrix } from "@modules/roles/components/RolePermissionMatrix";

import { searchRoles, readRole, createRole, updateRole, deleteRole, readRoleUsers } from "./provider";
import { getPermissionMatrix } from "@modules/roles/actions/roleService";
import type { RoleEntity, ContextItem } from "../types/types";

const formFields = [
    { name: "name" as const, label: "Nome", type: "text" as const, required: true },
    {
        name: "type" as const,
        label: "Tipo",
        type: "select" as const,
        required: true,
        options: ["ADMIN", "USER", "GUEST"],
    },
    { name: "description" as const, label: "Descrição", type: "textarea" as const },
];

const { parseListState, serializeListState } = createListQueryState();

const createRoleAction = createRecordFormAction.bind(null, "roles", formFields);

const rolesListLayout: ListLayout<RoleEntity> = {
    list: ({ data, pagination, searchArgs }) => <RolesListView data={data} pagination={pagination} sort={searchArgs.sort} />,
    form: () => (
        <FormView<RoleEntity>
            mode="create"
            fields={formFields}
            createAction={createRoleAction}
        />
    ),
};

const rolesDetailLayout: DetailLayout<RoleEntity> = {
    header: ({ record }) => ({
        title: record.name,
        subtitle: record.description ? [record.description] : [],
        status: record.isSystem ? (
            <Badge className={STATUS_BADGE_CLASSNAME.info}>Papel de sistema</Badge>
        ) : undefined,
    }),
    sections: [
        {
            key: "dados",
            title: "Dados",
            icon: KeyRound,
            column: 1,
            // Papel de sistema (ex.: ADMIN seedado) não pode ser renomeado/
            // reclassificado — o backend já bloqueia (RolesService.update),
            // aqui só evita mostrar um formulário que falharia.
            editable: (record) => !record.isSystem,
            fields: ["name", "type", "description"],
        },
    ],
    tabs: [
        {
            key: "permissoes",
            label: "Permissões",
            icon: KeyRound,
            content: ({ record }) => <RolePermissionsSection roleId={record.id} />,
        },
    ],
    relations: ({ record }) => [
        {
            key: "users",
            label: "Usuários",
            content: <RoleUsersSection roleId={record.id} />,
        },
    ],
};

function loadRoleContext(record: RoleEntity): ContextItem[] {
    return [
        { key: "createdAt", label: "Criado em", value: record.createdAt?.slice?.(0, 16).replace("T", ", ") ?? "" },
    ];
}

export const rolesModule = defineRecordModule<RoleEntity>({
    model: "roles",
    label: "Papéis",
    views: ["list"],
    defaultView: "list",
    dataHandlers: { search: searchRoles, read: readRole, create: createRole, update: updateRole, delete: deleteRole },
    formFields,
    parseListState,
    serializeListState,
    listLayout: rolesListLayout,
    detailLayout: rolesDetailLayout,
    detailConfig: { auditEnabled: true, loadContext: loadRoleContext },
});

registerModule(rolesModule);

async function RoleUsersSection({ roleId }: { roleId: string }) {
    const users = await readRoleUsers(roleId);
    return <RoleUsersHost roleId={roleId} initial={users ?? []} />;
}

async function RolePermissionsSection({ roleId }: { roleId: string }) {
    const matrix = await getPermissionMatrix(roleId);
    return <RolePermissionMatrix roleId={roleId} initial={matrix} />;
}
