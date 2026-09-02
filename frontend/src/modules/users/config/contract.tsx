import { defineRecordModule, registerModule } from "@lib/registry";
import type { DetailLayout, ListLayout } from "@lib/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { createRecordFormAction } from "@lib/registry/actions";

import { ListView } from "@components/TypeView/ListView/ListView";
import { FormView } from "@components/TypeView/FormView/FormView";
import { MetaDataView } from "@components/DetailView/MetaDataView";
import { MetaDataSidebar } from "@components/DetailView/MetaDataView/MetaDataSidebar";
import UserRolesHost from "@modules/users/components/UserRolesHost";
import { UserPermissionsHost } from "@modules/users/components/UserPermissionsHost";

import { searchUsers, readUser, createUser, updateUser, deleteUser, readUserRoles, readUserPermissions } from "./provider";
import type { UserEntity, ContextItem } from "../types/types";
import UsersListView from "../components/UsersListView";

const formFields = [
    { name: "email" as const, label: "E-mail", type: "text" as const, required: true },
    { name: "status" as const, label: "Status", type: "text" as const, required: true }
];

const { parseListState, serializeListState } = createListQueryState();

const createUserAction = createRecordFormAction.bind(
    null,
    "users",
    formFields.map((f) => f.name)
);

const usersListLayout: ListLayout<UserEntity> = {
    list: ({ data }) => <UsersListView data={data} />,
    form: () => (
        <FormView<UserEntity>
            mode="create"
            fields={formFields}
            createAction={createUserAction}
        />
    ),
};

const usersDetailLayout: DetailLayout<UserEntity> = {
    main: ({ record }) => (
        <FormView<UserEntity>
            mode="edit"
            model="users"
            recordId={record.id}
            fields={formFields}
            initialValues={record}
        />
    ),
    side: ({ contextItems, auditItems }) => (
        <MetaDataSidebar>
            <MetaDataView contextItems={contextItems} auditItems={auditItems} />
        </MetaDataSidebar>
    ),
    relations: ({ record }) => [
        { key: "roles", label: "Roles", content: <UserRolesSection userId={record.id} /> },
        { key: "permissions", label: "Permissions", content: <UserPermissionsSection userId={record.id} /> },
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
    label: "Users",
    views: ["list", "form"],
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