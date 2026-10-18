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
    Users as UsersIcon,
    Wallet,
} from "lucide-react";
import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, ListLayout } from "@core/registry/types";
import type { AuditFeedItem } from "@core/components/DetailView/MetaDataView/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { Badge } from "@components/ui/badge";
import { ShowcaseRelationTable } from "./ShowcaseRelationTable";

import { searchShowcase, readShowcase, FAMILY_MEMBERS } from "./provider";
import type { ShowcaseEntity } from "./types";

const DOCUMENTS = [
    { nome: "RG.pdf", tipo: "Documento pessoal", emissao: "12/03/2025", status: "Válido" },
    { nome: "CPF.pdf", tipo: "Documento pessoal", emissao: "12/03/2025", status: "Válido" },
    { nome: "Comprovante de residência.pdf", tipo: "Comprovante", emissao: "05/05/2025", status: "Válido" },
];

const INVOICES = [
    { descricao: "Mensalidade — março", valor: "R$ 120,00", vencimento: "10/03/2025", status: "Pago" },
    { descricao: "Mensalidade — abril", valor: "R$ 120,00", vencimento: "10/04/2025", status: "Pago" },
];

const PROJECTS = [{ nome: "Projeto Futuro", descricao: "Reforço escolar e inclusão digital", status: "Ativo" }];

// Fixture de auditoria — alinhada ao `createdAt` do RECORD em provider.ts (criação em
// 12/03/2025), pra "Registro criado em" bater com o evento POST mais antigo.
const AUDIT_ITEMS: AuditFeedItem[] = [
    {
        id: "audit-1",
        action: "POST",
        createdAt: "2025-03-12T10:24:00.000Z",
        userEmail: "ana.souza@exemplo.com",
        tenantName: "Tenant Exemplo",
        summary: "Registro criado",
    },
    {
        id: "audit-2",
        action: "PATCH",
        createdAt: "2025-08-12T11:20:00.000Z",
        userEmail: "ana.souza@exemplo.com",
        tenantName: "Tenant Exemplo",
        summary: "Inclusão de tag \"Música\"",
    },
    {
        id: "audit-3",
        action: "PATCH",
        createdAt: "2025-09-28T16:42:00.000Z",
        userEmail: "weverton.campos@exemplo.com",
        tenantName: "Tenant Exemplo",
        summary: "Atualização de dados pessoais",
    },
    {
        id: "audit-4",
        action: "PATCH",
        createdAt: "2025-10-10T14:32:00.000Z",
        userEmail: "weverton.campos@exemplo.com",
        tenantName: "Tenant Exemplo",
        summary: "Atualização de atendimento",
    },
];

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
    relations: ({ record }) => [
        {
            key: "familiares",
            label: "Familiares",
            icon: UsersIcon,
            count: (FAMILY_MEMBERS[record.id] ?? []).length,
            content: (
                <ShowcaseRelationTable
                    columns={[
                        { key: "nome", header: "Nome" },
                        { key: "parentesco", header: "Parentesco" },
                    ]}
                    rows={FAMILY_MEMBERS[record.id] ?? []}
                    linkKey="href"
                    searchPlaceholder="Pesquisar familiares"
                    addLabel="Vincular familiar"
                    emptyMessage="Nenhum familiar vinculado."
                />
            ),
        },
        {
            key: "documentos",
            label: "Documentos",
            icon: FileText,
            count: DOCUMENTS.length,
            content: (
                <ShowcaseRelationTable
                    columns={[
                        { key: "nome", header: "Nome do documento" },
                        { key: "tipo", header: "Tipo" },
                        { key: "emissao", header: "Data de emissão" },
                        { key: "status", header: "Status" },
                    ]}
                    rows={DOCUMENTS}
                    searchPlaceholder="Pesquisar documentos"
                    addLabel="Novo documento"
                    emptyMessage="Nenhum documento encontrado."
                />
            ),
        },
        {
            key: "financeiro",
            label: "Financeiro",
            icon: Wallet,
            count: INVOICES.length,
            content: (
                <ShowcaseRelationTable
                    columns={[
                        { key: "descricao", header: "Descrição" },
                        { key: "valor", header: "Valor" },
                        { key: "vencimento", header: "Vencimento" },
                        { key: "status", header: "Status" },
                    ]}
                    rows={INVOICES}
                    searchPlaceholder="Pesquisar lançamentos"
                    addLabel="Novo lançamento"
                    emptyMessage="Nenhum lançamento encontrado."
                />
            ),
        },
        {
            key: "projetos",
            label: "Projetos vinculados",
            icon: Briefcase,
            count: PROJECTS.length,
            content: (
                <ShowcaseRelationTable
                    columns={[
                        { key: "nome", header: "Projeto" },
                        { key: "descricao", header: "Descrição" },
                        { key: "status", header: "Status" },
                    ]}
                    rows={PROJECTS}
                    searchPlaceholder="Pesquisar projetos"
                    addLabel="Vincular projeto"
                    emptyMessage="Nenhum projeto vinculado."
                />
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
    detailConfig: {
        loadAudit: () => AUDIT_ITEMS,
        loadContext: (record) => [
            { key: "id", label: "ID do registro", value: `#${record.id}` },
            { key: "origin", label: "Origem do cadastro", value: "Formulário online" },
            { key: "status", label: "Status do registro", value: STATUS_LABEL[record.status] },
        ],
    },
});

registerModule(showcaseModule);
