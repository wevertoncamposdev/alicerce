import { User, Contact, Tags as TagsIcon, FileText, Activity, ClipboardList } from "lucide-react";
import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, ListLayout } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { createRecordFormAction } from "@core/registry/actions";

import { FormView } from "@components/TypeView/FormView/FormView";
import { ShowcaseRelationTable } from "@modules/develop/showcase/ShowcaseRelationTable";
import { PessoasListView } from "@modules/develop/demo/pessoas/components/PessoasListView";

import { searchPessoas, readPessoa, createPessoa, updatePessoa, deletePessoa } from "./provider";
import { ATIVIDADES, VINCULOS, ATENDIMENTOS } from "@modules/develop/demo/_shared/seed-data";
import type { Pessoa } from "../types/types";

// U1 (docs/PLAN-fundacao-ux.md): seções só de leitura de propósito — este
// módulo nunca entra em `alicerce.config.ts`/`bootstrap.ts` (não é módulo
// de domínio real), então `${model}.update` nunca resolve numa permissão
// de verdade (ver `EditableSection`/`resolveActionPermission`). Testar
// autosave de verdade fica pros módulos reais; a U1 só prova navegação.
const formFields = [
    { name: "nome" as const, label: "Nome", type: "text" as const, required: true, primary: true },
    { name: "nascimento" as const, label: "Nascimento", type: "text" as const },
    { name: "cpf" as const, label: "CPF", type: "text" as const },
    { name: "telefone" as const, label: "Telefone", type: "text" as const },
    { name: "email" as const, label: "E-mail", type: "email" as const },
    { name: "cidade" as const, label: "Cidade", type: "text" as const },
    {
        name: "status" as const,
        label: "Status",
        type: "select" as const,
        options: [{ label: "Ativo", value: "ATIVO" }, { label: "Inativo", value: "INATIVO" }],
    },
    { name: "observacoes" as const, label: "Observações", type: "textarea" as const },
];

const { parseListState, serializeListState } = createListQueryState();

const createPessoaAction = createRecordFormAction.bind(null, "demo-pessoas", formFields);

const pessoasListLayout: ListLayout<Pessoa> = {
    list: ({ data, pagination, searchArgs }) => (
        <PessoasListView data={data} pagination={pagination} sort={searchArgs.sort} />
    ),
    form: () => <FormView<Pessoa> mode="create" fields={formFields} createAction={createPessoaAction} />,
};

function initials(nome: string): string {
    return nome
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

const STATUS_LABEL: Record<Pessoa["status"], string> = { ATIVO: "Ativo", INATIVO: "Inativo" };

const pessoasDetailLayout: DetailLayout<Pessoa> = {
    header: ({ record }) => ({
        title: record.nome,
        subtitle: [STATUS_LABEL[record.status]],
        avatar: { fallback: initials(record.nome) },
    }),
    sections: [
        {
            key: "dados-pessoais",
            title: "Dados pessoais",
            icon: User,
            column: 1,
            fields: ["nascimento", "cpf"],
        },
        {
            key: "contato",
            title: "Contato",
            icon: Contact,
            column: 1,
            fields: ["telefone", "email", "cidade"],
        },
        {
            key: "tags",
            title: "Tags",
            icon: TagsIcon,
            column: 2,
            render: ({ record }) =>
                record.tags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma tag.</p>
                ) : (
                    <div className="flex flex-wrap gap-1.5">
                        {record.tags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                ),
        },
        {
            key: "observacoes",
            title: "Observações",
            icon: FileText,
            column: 2,
            fields: ["observacoes"],
        },
    ],
    relations: ({ record }) => {
        const vinculosDaPessoa = VINCULOS.filter((v) => v.pessoaId === record.id);
        const atividadesRows = vinculosDaPessoa.map((vinculo) => {
            const atividade = ATIVIDADES.find((a) => a.id === vinculo.atividadeId);
            return {
                nome: atividade?.nome ?? vinculo.atividadeId,
                tipo: vinculo.tipo,
                periodo: vinculo.periodoFim
                    ? `${vinculo.periodoInicio} – ${vinculo.periodoFim}`
                    : `desde ${vinculo.periodoInicio}`,
                href: `/develop/demo/atividades/${vinculo.atividadeId}`,
            };
        });

        const SITUACAO_LABEL: Record<string, string> = {
            AGENDADO: "Agendado",
            REALIZADO: "Realizado",
            CANCELADO: "Cancelado",
        };

        const atendimentosRows = ATENDIMENTOS.filter((a) => a.pessoaId === record.id).map((atendimento) => ({
            data: atendimento.data,
            tipo: atendimento.tipo === "SOCIAL" ? "Social" : "Psicológico",
            situacao: SITUACAO_LABEL[atendimento.situacao] ?? atendimento.situacao,
            href: `/develop/demo/atendimentos/${atendimento.id}`,
        }));

        return [
            {
                key: "atividades",
                label: "Atividades",
                icon: Activity,
                count: atividadesRows.length,
                content: (
                    <ShowcaseRelationTable
                        columns={[
                            { key: "nome", header: "Atividade" },
                            { key: "tipo", header: "Vínculo" },
                            { key: "periodo", header: "Período" },
                        ]}
                        rows={atividadesRows}
                        searchPlaceholder="Pesquisar atividades"
                        addLabel="Novo vínculo"
                        emptyMessage="Nenhuma atividade vinculada."
                        linkKey="href"
                    />
                ),
            },
            {
                key: "atendimentos",
                label: "Atendimentos",
                icon: ClipboardList,
                count: atendimentosRows.length,
                content: (
                    <ShowcaseRelationTable
                        columns={[
                            { key: "data", header: "Data" },
                            { key: "tipo", header: "Tipo" },
                            { key: "situacao", header: "Situação" },
                        ]}
                        rows={atendimentosRows}
                        searchPlaceholder="Pesquisar atendimentos"
                        addLabel="Novo atendimento"
                        emptyMessage="Nenhum atendimento registrado."
                        linkKey="href"
                    />
                ),
            },
        ];
    },
};

export const pessoasModule = defineRecordModule<Pessoa>({
    model: "demo-pessoas",
    label: "Pessoas (demo)",
    views: ["list"],
    defaultView: "list",
    dataHandlers: {
        search: searchPessoas,
        read: readPessoa,
        create: createPessoa,
        update: updatePessoa,
        delete: deletePessoa,
    },
    formFields,
    parseListState,
    serializeListState,
    listLayout: pessoasListLayout,
    detailLayout: pessoasDetailLayout,
});

registerModule(pessoasModule);
