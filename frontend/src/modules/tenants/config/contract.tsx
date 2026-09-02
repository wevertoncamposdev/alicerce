import { defineRecordModule, registerModule } from "@lib/registry";
import type { DetailLayout, ListLayout } from "@lib/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { createRecordFormAction } from "@lib/registry/actions";

import { ListView } from "@components/TypeView/ListView/ListView";
import { FormView } from "@components/TypeView/FormView/FormView";
import { MetaDataView } from "@components/DetailView/MetaDataView";
import { MetaDataSidebar } from "@components/DetailView/MetaDataView/MetaDataSidebar";
import { TenantsListView } from "@modules/tenants/components/TenantsListView";
import { TenantUsersHost } from "@modules/tenants/components/TenantUsersHost";
import { TenantRolesHost } from "@modules/tenants/components/TenantRolesHost";

import { searchTenants, readTenant, createTenant, updateTenant, deleteTenant, readTenantUsers, readTenantRoles } from "./provider";
import type { TenantEntity, ContextItem } from "../types/types";

const formFields = [
    { name: "legalName" as const, label: "Razão Social", type: "text" as const, required: true },
    { name: "registrationNumber" as const, label: "Nº de Registro", type: "text" as const, required: true },
    { name: "slug" as const, label: "Slug", type: "text" as const, required: true },
    { name: "email" as const, label: "E-mail", type: "text" as const },
    { name: "website" as const, label: "Site", type: "url" as const },
];

const { parseListState, serializeListState } = createListQueryState();

const createTenantAction = createRecordFormAction.bind(
    null,
    "tenants",
    formFields.map((f) => f.name)
);

const tenantsListLayout: ListLayout<TenantEntity> = {
    list: ({ data }) => <TenantsListView data={data} />,
    form: () => (
        <FormView<TenantEntity>
            mode="create"
            fields={formFields}
            createAction={createTenantAction}
        />
    ),
};

const tenantsDetailLayout: DetailLayout<TenantEntity> = {
    main: ({ record }) => (
        <FormView<TenantEntity>
            mode="edit"
            model="tenants"
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
        { key: "users", label: "Users", content: <TenantUsersSection tenantId={record.id} /> },
        { key: "roles", label: "Roles", content: <TenantRolesSection tenantId={record.id} /> },
    ],
};

function loadTenantContext(record: TenantEntity): ContextItem[] {
    return [
        { key: "createdAt", label: "Criado em", value: record.createdAt.slice(0, 16).replace("T", ", ") },
        { key: "slug", label: "Slug", value: record.slug },
    ];
}

export const tenantsModule = defineRecordModule<TenantEntity>({
    model: "tenants",
    label: "Tenants",
    views: ["list", "form"],
    defaultView: "list",
    dataHandlers: { search: searchTenants, read: readTenant, create: createTenant, update: updateTenant, delete: deleteTenant },
    formFields,
    parseListState,
    serializeListState,
    listLayout: tenantsListLayout,
    detailLayout: tenantsDetailLayout,
    detailConfig: { auditEnabled: true, loadContext: loadTenantContext },
});

registerModule(tenantsModule);

async function TenantUsersSection({ tenantId }: { tenantId: string }) {
    const users = await readTenantUsers(tenantId);
    return <TenantUsersHost items={users ?? []} />;
}

async function TenantRolesSection({ tenantId }: { tenantId: string }) {
    const roles = await readTenantRoles(tenantId);
    return <TenantRolesHost items={roles ?? []} />;
}