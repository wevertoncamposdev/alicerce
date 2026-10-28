import { UserRound } from "lucide-react";
import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, ListLayout } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { createRecordFormAction } from "@core/registry/actions";

import { FormView } from "@components/TypeView/FormView/FormView";
import UserRolesHost from "@modules/users/components/UserRolesHost";
import { UserPermissionsHost } from "@modules/users/components/UserPermissionsHost";
import { UserStatusBadge } from "@modules/users/components/UserStatusBadge";
import { UserToolbarActions } from "@modules/users/components/UserToolbarActions";

import { searchUsers, readUser, createUser, updateUser, deleteUser, readUserRoles, readUserPermissions } from "./provider";
import type { UserEntity, ContextItem } from "../types/types";
import UsersListView from "../components/UsersListView";

// Sem campo de senha (etapa 7.4, Plano Base.md): "criar" um usuário é
// convidar — quem aceita o convite é quem escolhe a própria senha. Mesmos
// campos servem o Sheet de criação e a seção "Dados" editável do Detail.
const formFields = [
    { name: "email" as const, label: "E-mail", type: "email" as const, required: true },
    { name: "name" as const, label: "Nome", type: "text" as const },
];

const { parseListState, serializeListState } = createListQueryState();

const createUserAction = createRecordFormAction.bind(
    null,
    "users",
    formFields,
);

const usersListLayout: ListLayout<UserEntity> = {
    list: ({ data, pagination, searchArgs }) => <UsersListView data={data} pagination={pagination} sort={searchArgs.sort} />,
    form: () => (
        <FormView<UserEntity>
            mode="create"
            fields={formFields}
            createAction={createUserAction}
        />
    ),
};

function initials(record: UserEntity): string {
    const source = record.name?.trim() || record.email;
    return source.slice(0, 2).toUpperCase();
}

const usersDetailLayout: DetailLayout<UserEntity> = {
    header: ({ record }) => ({
        title: record.name ?? record.email,
        subtitle: record.name ? [record.email] : [],
        avatar: { src: record.avatarUrl ?? undefined, fallback: initials(record) },
        status: <UserStatusBadge user={record} />,
    }),
    sections: [
        {
            key: "dados",
            title: "Dados",
            icon: UserRound,
            column: 1,
            editable: true,
            fields: ["email", "name"],
        },
    ],
    toolbar: ({ record }) => <UserToolbarActions user={record} />,
    relations: ({ record }) => [
        { key: "roles", label: "Papéis", content: <UserRolesSection userId={record.id} /> },
        { key: "permissions", label: "Permissões efetivas", content: <UserPermissionsSection userId={record.id} /> },
    ],
};

function loadUserContext(record: UserEntity): ContextItem[] {
    return [
        { key: "createdAt", label: "Criado em", value: record.createdAt.slice(0, 16).replace("T", ", ") },
        { key: "email", label: "E-mail", value: record.email },
        { key: "tenantId", label: "Tenant", value: record.tenantId },
    ];
}

export const usersModule = defineRecordModule<UserEntity>({
    model: "users",
    label: "Usuários",
    views: ["list"],
    defaultView: "list",
    dataHandlers: { search: searchUsers, read: readUser, create: createUser, update: updateUser, delete: deleteUser },
    formFields,
    parseListState,
    serializeListState,
    listLayout: usersListLayout,
    detailLayout: usersDetailLayout,
    detailConfig: { auditEnabled: true, loadContext: loadUserContext },
});

registerModule(usersModule);

async function UserRolesSection({ userId }: { userId: string }) {
    const roles = await readUserRoles(userId);
    return <UserRolesHost userId={userId} initial={roles ?? []} />;
}

async function UserPermissionsSection({ userId }: { userId: string }) {
    const permissions = await readUserPermissions(userId);
    return <UserPermissionsHost items={permissions ?? []} />;
}
