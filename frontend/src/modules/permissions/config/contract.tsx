import { defineRecordModule, registerModule } from "@lib/registry";
import type { DetailLayout, ListLayout } from "@lib/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { createRecordFormAction } from "@lib/registry/actions";

import { PermissionsListView } from "@modules/permissions/components/PermissionsListView";
import { FormView } from "@components/TypeView/FormView/FormView";
import { MetaDataView } from "@components/DetailView/MetaDataView";
import { MetaDataSidebar } from "@components/DetailView/MetaDataView/MetaDataSidebar";

import { searchPermissions, readPermission, createPermission, updatePermission, deletePermission } from "./provider";
import { permissionColumns } from "../components/columns";
import type { PermissionEntity, ContextItem } from "../types/types";

const formFields = [
    { name: "name" as const, label: "Nome", type: "text" as const, required: true },
    { name: "type" as const, label: "Tipo", type: "text" as const },
    { name: "resource" as const, label: "Recurso", type: "text" as const },
];

const { parseListState, serializeListState } = createListQueryState();

const createPermissionAction = createRecordFormAction.bind(null, "permissions", formFields.map((f) => f.name));

const permissionsListLayout: ListLayout<PermissionEntity> = {
    list: ({ data }) => <PermissionsListView data={data} />,
    form: () => (
        <FormView<PermissionEntity>
            mode="create"
            fields={formFields}
            createAction={createPermissionAction}
        />
    ),
};

const permissionsDetailLayout: DetailLayout<PermissionEntity> = {
    main: ({ record }) => (
        <FormView<PermissionEntity>
            mode="edit"
            model="permissions"
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
};

function loadPermissionContext(record: PermissionEntity): ContextItem[] {
    return [
        { key: "createdAt", label: "Criado em", value: record.createdAt?.slice?.(0, 16).replace("T", ", ") ?? "" },
    ];
}

export const permissionsModule = defineRecordModule<PermissionEntity>({
    model: "permissions",
    label: "Permissions",
    views: ["list", "form"],
    defaultView: "list",
    dataHandlers: { search: searchPermissions, read: readPermission, create: createPermission, update: updatePermission, delete: deletePermission },
    formFields,
    parseListState,
    serializeListState,
    listLayout: permissionsListLayout,
    detailLayout: permissionsDetailLayout,
    detailConfig: { auditEnabled: true, loadContext: loadPermissionContext },
});

registerModule(permissionsModule);
