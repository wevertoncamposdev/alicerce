import { User as UserIcon, Shield, SlidersHorizontal, Mail, Monitor } from "lucide-react";
import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, ListLayout } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";

import { ProfileFormSection } from "@modules/perfil/components/ProfileFormSection";
import { ChangePasswordControl } from "@modules/perfil/components/ChangePasswordControl";
import { ProfileSessionsHost } from "@modules/perfil/components/ProfileSessionsHost";

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
];

// Stubs — "perfil" não tem rota de lista (ver ADR 0009), nunca exercitados.
const { parseListState, serializeListState } = createListQueryState();

const perfilDetailLayout: DetailLayout<MeProfile> = {
    header: ({ record }) => ({
        title: record.name ?? record.email,
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
