import { Building2, Contact, MapPin, Image as ImageIcon } from "lucide-react";
import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, ListLayout } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { alicerceTerms } from "@/alicerce.config";

import { InstitutionFormSection } from "@modules/instituicao/components/InstitutionFormSection";

import { readCurrentTenant, updateCurrentTenant, searchCurrentTenantStub } from "./provider";
import type { TenantProfile } from "../types/types";

const formFields = [
    { name: "tradeName" as const, label: "Nome fantasia", placeholder: "Nome fantasia", type: "text" as const },
    {
        name: "documentType" as const,
        label: "Tipo de documento",
        type: "select" as const,
        options: [
            { label: "CNPJ", value: "CNPJ" },
            { label: "CPF", value: "CPF" },
            { label: "Outro", value: "OUTRO" },
        ],
    },
    { name: "document" as const, label: "Documento", placeholder: "Só números", type: "text" as const },
    { name: "email" as const, label: "E-mail", type: "email" as const },
    { name: "phone" as const, label: "Telefone", type: "text" as const },
    { name: "website" as const, label: "Site", type: "url" as const },
    { name: "addressStreet" as const, label: "Logradouro", type: "text" as const },
    { name: "addressNumber" as const, label: "Número", type: "text" as const },
    { name: "addressComplement" as const, label: "Complemento", type: "text" as const },
    { name: "addressNeighborhood" as const, label: "Bairro", type: "text" as const },
    { name: "addressCity" as const, label: "Cidade", type: "text" as const },
    { name: "addressState" as const, label: "UF", type: "text" as const },
    { name: "addressZipCode" as const, label: "CEP", type: "text" as const },
    {
        name: "logoFileId" as const,
        label: "Logo",
        type: "image" as const,
        previewField: "logoUrl" as const,
        uploadOwnerType: "tenant.logo",
    },
];

function initials(record: TenantProfile): string {
    return record.legalName.slice(0, 2).toUpperCase();
}

// Stubs — "instituicao" não tem rota de lista (mesmo padrão de ADR 0009),
// nunca exercitados.
const { parseListState, serializeListState } = createListQueryState();

const instituicaoDetailLayout: DetailLayout<TenantProfile> = {
    header: ({ record }) => ({
        title: record.legalName,
        subtitle: [record.slug],
        avatar: { src: record.logoUrl ?? undefined, fallback: initials(record) },
    }),
    sections: [
        {
            key: "logo",
            title: "Logo",
            icon: ImageIcon,
            column: 1,
            render: ({ record }) => (
                <InstitutionFormSection fields={["logoFileId"]} record={record} formFields={formFields} />
            ),
        },
        {
            key: "identificacao",
            title: "Identificação",
            icon: Building2,
            column: 1,
            render: ({ record }) => (
                <InstitutionFormSection
                    fields={["tradeName", "documentType", "document"]}
                    record={record}
                    formFields={formFields}
                />
            ),
        },
        {
            key: "contato",
            title: "Contato",
            icon: Contact,
            column: 1,
            render: ({ record }) => (
                <InstitutionFormSection
                    fields={["email", "phone", "website"]}
                    record={record}
                    formFields={formFields}
                />
            ),
        },
        {
            key: "endereco",
            title: "Endereço",
            icon: MapPin,
            column: 2,
            render: ({ record }) => (
                <InstitutionFormSection
                    fields={[
                        "addressStreet",
                        "addressNumber",
                        "addressComplement",
                        "addressNeighborhood",
                        "addressCity",
                        "addressState",
                        "addressZipCode",
                    ]}
                    record={record}
                    formFields={formFields}
                />
            ),
        },
    ],
};

export const instituicaoModule = defineRecordModule<TenantProfile>({
    model: "instituicao",
    label: alicerceTerms.tenant,
    views: [],
    defaultView: "detail",
    dataHandlers: {
        search: searchCurrentTenantStub,
        read: () => readCurrentTenant(),
        update: (_id, payload) => updateCurrentTenant(payload as Partial<TenantProfile>),
    },
    formFields,
    parseListState,
    serializeListState,
    listLayout: {} as ListLayout<TenantProfile>,
    detailLayout: instituicaoDetailLayout,
});

registerModule(instituicaoModule);
