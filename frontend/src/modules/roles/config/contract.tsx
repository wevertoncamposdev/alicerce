import { defineRecordModule, registerModule } from "@lib/registry";
import type { DetailLayout, ListLayout } from "@lib/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { createRecordFormAction } from "@lib/registry/actions";

import { RolesListView } from "@modules/roles/components/RoleListView";
import { FormView } from "@components/TypeView/FormView/FormView";
import RolePermissionsHost from "@modules/roles/components/RolePermissionsHost";
import RoleUsersHost from "@modules/roles/components/RoleUsersHost";

import { searchRoles, readRole, createRole, updateRole, deleteRole, readRolePermissions, readRoleUsers } from "./provider";
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

const createRoleAction = createRecordFormAction.bind(null, "roles", formFields.map((f) => f.name));

const rolesListLayout: ListLayout<RoleEntity> = {
    list: ({ data }) => <RolesListView data={data} />,
    form: () => (
        <FormView<RoleEntity>
            mode="create"
            fields={formFields}
            createAction={createRoleAction}
        />
    ),
};

const rolesDetailLayout: DetailLayout<RoleEntity> = {
    main: ({ record }) => (
        <FormView<RoleEntity>
            mode="edit"
            model="roles"
            recordId={record.id}
            fields={formFields}
            initialValues={record}
        />
    ),
    relations: ({ record }) => [
        {
            key: "users",
            label: "Users",
            content: <RoleUsersSection roleId={record.id} />,
        },
        {
            key: "permissions",
            label: "Permissions",
            content: <RolePermissionsSection roleId={record.id} />,
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
    label: "Roles",
    views: ["list", "form"],
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

async function RolePermissionsSection({ roleId }: { roleId: string }) {
    const permissions = await readRolePermissions(roleId);
    return <RolePermissionsHost roleId={roleId} initial={permissions ?? []} />;
}

async function RoleUsersSection({ roleId }: { roleId: string }) {
    const users = await readRoleUsers(roleId);
    return <RoleUsersHost roleId={roleId} initial={users ?? []} />;
}
