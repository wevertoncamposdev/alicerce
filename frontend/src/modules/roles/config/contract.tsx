import { defineRecordModule, registerModule } from "@lib/registry";
import type { DetailLayout, ListLayout } from "@lib/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { createRecordFormAction } from "@lib/registry/actions";

import { ListView } from "@components/TypeView/ListView/ListView";
import { FormView } from "@components/TypeView/FormView/FormView";
import { MetaDataView } from "@components/DetailView/MetaDataView";
import { MetaDataSidebar } from "@components/DetailView/MetaDataView/MetaDataSidebar";
import { RolesListView } from "@modules/roles/components/RoleListView";

import { search, read, create, update, remove } from "./provider";
import { roleColumns } from "@modules/roles/components/columns";
import type { RoleEntity, ContextItem } from "@modules/roles/types/types";

const formFields = [
    { name: "name" as const, label: "Nome", type: "text" as const, required: true },
    { name: "type" as const, label: "Tipo", type: "text" as const, required: true },
    { name: "description" as const, label: "Descrição", type: "text" as const, required: true },
];

const { parseListState, serializeListState } = createListQueryState();

const createRoleAction = createRecordFormAction.bind(
    null,
    "roles",
    formFields.map((f) => f.name)
);

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
    side: ({ contextItems, auditItems }) => (
        <MetaDataSidebar>
            <MetaDataView contextItems={contextItems} auditItems={auditItems} />
        </MetaDataSidebar>
    ),
};

function loadRoleContext(record: RoleEntity): ContextItem[] {
    return [
        { key: "createdAt", label: "Criado em", value: record.createdAt.slice(0, 16).replace("T", ", ") }
    ];
}

export const rolesModule = defineRecordModule<RoleEntity>({
    model: "roles",
    label: "Roles",
    views: ["list", "form"],
    defaultView: "list",
    dataHandlers: { search: search, read: read, create: create, update: update, delete: remove },
    formFields,
    parseListState,
    serializeListState,
    listLayout: rolesListLayout,
    detailLayout: rolesDetailLayout,
    detailConfig: { auditEnabled: true, loadContext: loadRoleContext },
});

registerModule(rolesModule);