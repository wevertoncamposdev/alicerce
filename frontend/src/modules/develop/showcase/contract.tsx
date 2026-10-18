// modules/develop/showcase/contract.tsx
//
// Módulo fictício em memória — não é um módulo de domínio real: não entra em
// `alicerce.config.ts` nem em `bootstrap.ts`, não aparece na navegação, não exige
// permissão. Serve só pra comparar o motor de DetailView com a referência visual
// (docs/ui/reference/detail-layout.png) em `/develop/detail-showcase`, crescendo junto
// com os commits do ADR 0004 (docs/ui/detail-page.md §8).
import {
    Mail,
    Phone,
    MapPin,
    History,
    CalendarClock,
    IdCard,
    Briefcase,
    FileText,
    Tag as TagIcon,
} from "lucide-react";
import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, ListLayout } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { Badge } from "@components/ui/badge";

import { searchShowcase, readShowcase } from "./provider";
import type { ShowcaseEntity } from "./types";

const formFields = [
    { name: "name" as const, label: "Nome completo", type: "text" as const, required: true },
    { name: "role" as const, label: "Função", type: "text" as const },
    { name: "email" as const, label: "E-mail", type: "email" as const },
    { name: "phone" as const, label: "Telefone", type: "text" as const },
    { name: "city" as const, label: "Cidade", type: "text" as const },
    { name: "document" as const, label: "CPF", type: "text" as const },
    { name: "birthDate" as const, label: "Data de nascimento", type: "text" as const },
    { name: "maritalStatus" as const, label: "Estado civil", type: "text" as const },
    { name: "nationality" as const, label: "Nacionalidade", type: "text" as const },
    { name: "department" as const, label: "Área", type: "text" as const },
    { name: "notes" as const, label: "Observações gerais", type: "textarea" as const },
];

const { parseListState, serializeListState } = createListQueryState();

const showcaseListLayout: ListLayout<ShowcaseEntity> = {
    list: () => (
        <p className="text-sm text-muted-foreground">
            Sem listagem real — abra <code>/develop/detail-showcase</code>.
        </p>
    ),
};

const STATUS_LABEL: Record<ShowcaseEntity["status"], string> = {
    active: "Ativo",
    inactive: "Inativo",
};

// Mapa semântico de docs/ui/detail-page.md §3 — badges de status usam sempre esses tokens,
// nunca cor solta.
const STATUS_CLASSNAME: Record<ShowcaseEntity["status"], string> = {
    active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    inactive: "bg-muted text-muted-foreground",
};

const showcaseDetailLayout: DetailLayout<ShowcaseEntity> = {
    header: ({ record }) => ({
        title: record.name,
        subtitle: [record.role, record.city],
        avatar: { fallback: record.name.split(" ").slice(0, 2).map((p) => p[0]).join("") },
        status: (
            <Badge variant="outline" className={`border-transparent ${STATUS_CLASSNAME[record.status]}`}>
                {STATUS_LABEL[record.status]}
            </Badge>
        ),
        contacts: [
            { icon: Mail, text: record.email, href: `mailto:${record.email}` },
            { icon: Phone, text: record.phone },
            { icon: MapPin, text: record.city },
        ],
    }),
    sections: [
        {
            key: "personal",
            title: "Dados pessoais",
            icon: IdCard,
            column: 1,
            editable: true,
            fields: ["document", "birthDate", "maritalStatus", "nationality"],
        },
        {
            key: "contact",
            title: "Contato",
            icon: Phone,
            column: 2,
            editable: true,
            fields: ["email", "phone", "city"],
        },
        {
            key: "activity",
            title: "Atividade",
            icon: Briefcase,
            column: 3,
            editable: true,
            fields: ["role", "department"],
        },
        {
            key: "notes",
            title: "Observações",
            icon: FileText,
            column: 1,
            editable: true,
            fields: ["notes"],
        },
        {
            key: "tags",
            title: "Tags",
            icon: TagIcon,
            column: 2,
            render: ({ record }) => (
                <div className="flex flex-wrap gap-1.5">
                    {record.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="rounded-full border-transparent bg-primary/10 text-primary">
                            {tag}
                        </Badge>
                    ))}
                </div>
            ),
        },
    ],
    tabs: [
        {
            key: "historico",
            label: "Histórico",
            icon: History,
            content: () => (
                <p className="text-sm text-muted-foreground">
                    Conteúdo fictício da aba Histórico — chega nos próximos commits.
                </p>
            ),
        },
        {
            key: "atendimentos",
            label: "Atendimentos",
            icon: CalendarClock,
            content: () => (
                <p className="text-sm text-muted-foreground">
                    Conteúdo fictício da aba Atendimentos — chega nos próximos commits.
                </p>
            ),
        },
    ],
};

export const showcaseModule = defineRecordModule<ShowcaseEntity>({
    model: "develop-showcase",
    label: "Showcase",
    views: ["list"],
    defaultView: "list",
    dataHandlers: {
        search: searchShowcase,
        read: readShowcase,
    },
    formFields,
    parseListState,
    serializeListState,
    listLayout: showcaseListLayout,
    detailLayout: showcaseDetailLayout,
});

registerModule(showcaseModule);
