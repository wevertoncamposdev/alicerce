import { User as UserIcon, Shield, SlidersHorizontal, Mail, Monitor, Image as ImageIcon, Download } from "lucide-react";
import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, ListLayout } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";

import { ProfileFormSection } from "@modules/perfil/components/ProfileFormSection";
import { ChangePasswordControl } from "@modules/perfil/components/ChangePasswordControl";
import { ChangeEmailControl } from "@modules/perfil/components/ChangeEmailControl";
import { ProfileSessionsHost } from "@modules/perfil/components/ProfileSessionsHost";
import { ExportDataControl } from "@modules/perfil/components/ExportDataControl";

import { readMe, updateMe, searchMeStub } from "./provider";
import { listMySessions } from "./sessions-provider";
import type { MeProfile } from "../types/types";

const formFields = [
    { name: "name" as const, label: "Nome", placeholder: "Seu nome", type: "text" as const },
    {
        name: "theme" as const,
        label: "Tema",
        type: "select" as const,
        options: [
            { label: "Claro", value: "light" },
            { label: "Escuro", value: "dark" },
            { label: "Sistema", value: "system" },
        ],
    },
    { name: "locale" as const, label: "Idioma", placeholder: "pt-BR", type: "text" as const },
    {
        name: "avatarFileId" as const,
        label: "Foto",
        type: "image" as const,
        previewField: "avatarUrl" as const,
        uploadOwnerType: "user.avatar",
    },
];

function initials(record: MeProfile): string {
    const source = record.name ?? record.email;
    return source.slice(0, 2).toUpperCase();
}

// Stubs — "perfil" não tem rota de lista (ver ADR 0009), nunca exercitados.
const { parseListState, serializeListState } = createListQueryState();

const perfilDetailLayout: DetailLayout<MeProfile> = {
    header: ({ record }) => ({
        title: record.name ?? record.email,
        avatar: { src: record.avatarUrl ?? undefined, fallback: initials(record) },
        contacts: [{ icon: Mail, text: record.email }],
    }),
    sections: [
        {
            key: "dados",
            title: "Dados",
            icon: UserIcon,
            column: 1,
            render: ({ record }) => (
                <ProfileFormSection fields={["name"]} record={record} formFields={formFields} />
            ),
        },
        {
            key: "foto",
            title: "Foto",
            icon: ImageIcon,
            column: 1,
            render: ({ record }) => (
                <ProfileFormSection fields={["avatarFileId"]} record={record} formFields={formFields} />
            ),
        },
        {
            key: "email",
            title: "E-mail",
            icon: Mail,
            column: 1,
            render: ({ record }) => <ChangeEmailControl currentEmail={record.email} />,
        },
        {
            key: "seguranca",
            title: "Segurança",
            icon: Shield,
            column: 1,
            render: () => <ChangePasswordControl />,
        },
        {
            key: "preferencias",
            title: "Preferências",
            icon: SlidersHorizontal,
            column: 2,
            render: ({ record }) => (
                <ProfileFormSection fields={["theme", "locale"]} record={record} formFields={formFields} />
            ),
        },
        {
            key: "privacidade",
            title: "Privacidade",
            icon: Download,
            column: 2,
            render: () => <ExportDataControl />,
        },
    ],
    relations: async () => {
        const sessions = await listMySessions();
        return [
            {
                key: "sessoes",
                label: "Sessões ativas",
                icon: Monitor,
                count: sessions.length,
                content: <ProfileSessionsHost initial={sessions} />,
            },
        ];
    },
};

export const perfilModule = defineRecordModule<MeProfile>({
    model: "perfil",
    label: "Perfil",
    views: [],
    defaultView: "detail",
    dataHandlers: {
        search: searchMeStub,
        read: () => readMe(),
        update: (_id, payload) => updateMe(payload as Partial<MeProfile>),
    },
    formFields,
    parseListState,
    serializeListState,
    listLayout: {} as ListLayout<MeProfile>,
    detailLayout: perfilDetailLayout,
});

registerModule(perfilModule);
