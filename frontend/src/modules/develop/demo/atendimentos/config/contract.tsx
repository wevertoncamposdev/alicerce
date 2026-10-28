import Link from "next/link";
import { CalendarDays, FileText, UserRound } from "lucide-react";
import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, ListLayout } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { createRecordFormAction } from "@core/registry/actions";

import { FormView } from "@components/TypeView/FormView/FormView";
import { AtendimentosListView } from "@modules/develop/demo/atendimentos/components/AtendimentosListView";

import { searchAtendimentos, readAtendimento, createAtendimento, updateAtendimento, deleteAtendimento } from "./provider";
import { PESSOAS } from "@modules/develop/demo/_shared/seed-data";
import type { Atendimento } from "../types/types";

// U1 (docs/PLAN-fundacao-ux.md): seções só de leitura, mesmo motivo do
// módulo Pessoas (ver `pessoas/config/contract.tsx`). `pessoaId` não tem
// campo de formulário — vira só o link de "Pessoa atendida" (render
// customizado), igual ao padrão de `showcase/contract.tsx`.
const formFields = [
    { name: "data" as const, label: "Data", type: "text" as const, required: true, primary: true },
    {
        name: "tipo" as const,
        label: "Tipo",
        type: "select" as const,
        options: [{ label: "Social", value: "SOCIAL" }, { label: "Psicológico", value: "PSICOLOGICO" }],
    },
    { name: "profissional" as const, label: "Profissional", type: "text" as const },
    {
        name: "situacao" as const,
        label: "Situação",
        type: "select" as const,
        options: [
            { label: "Agendado", value: "AGENDADO" },
            { label: "Realizado", value: "REALIZADO" },
            { label: "Cancelado", value: "CANCELADO" },
        ],
    },
    { name: "sigiloso" as const, label: "Sigiloso", type: "switch" as const },
    { name: "observacoes" as const, label: "Observações", type: "textarea" as const },
];

const { parseListState, serializeListState } = createListQueryState();

const createAtendimentoAction = createRecordFormAction.bind(null, "demo-atendimentos", formFields);

const atendimentosListLayout: ListLayout<Atendimento> = {
    list: ({ data, pagination, searchArgs }) => (
        <AtendimentosListView data={data} pagination={pagination} sort={searchArgs.sort} />
    ),
    form: () => <FormView<Atendimento> mode="create" fields={formFields} createAction={createAtendimentoAction} />,
};

const TIPO_LABEL: Record<Atendimento["tipo"], string> = { SOCIAL: "Social", PSICOLOGICO: "Psicológico" };
const SITUACAO_LABEL: Record<Atendimento["situacao"], string> = {
    AGENDADO: "Agendado",
    REALIZADO: "Realizado",
    CANCELADO: "Cancelado",
};

const atendimentosDetailLayout: DetailLayout<Atendimento> = {
    header: ({ record }) => ({
        title: `Atendimento ${record.data}`,
        subtitle: [TIPO_LABEL[record.tipo], SITUACAO_LABEL[record.situacao]],
        avatar: { fallback: TIPO_LABEL[record.tipo].slice(0, 2).toUpperCase() },
    }),
    sections: [
        {
            key: "detalhes",
            title: "Detalhes",
            icon: CalendarDays,
            column: 1,
            fields: ["tipo", "profissional", "situacao", "sigiloso"],
        },
        {
            key: "pessoa-atendida",
            title: "Pessoa atendida",
            icon: UserRound,
            column: 1,
            render: ({ record }) => {
                const pessoa = PESSOAS.find((p) => p.id === record.pessoaId);
                return pessoa ? (
                    <Link
                        href={`/develop/demo/pessoas/${pessoa.id}`}
                        className="font-medium text-foreground hover:underline"
                    >
                        {pessoa.nome}
                    </Link>
                ) : (
                    <p className="text-sm text-muted-foreground">Pessoa não encontrada.</p>
                );
            },
        },
        {
            key: "observacoes",
            title: "Observações",
            icon: FileText,
            column: 2,
            fields: ["observacoes"],
        },
    ],
};

export const atendimentosModule = defineRecordModule<Atendimento>({
    model: "demo-atendimentos",
    label: "Atendimentos (demo)",
    views: ["list"],
    defaultView: "list",
    dataHandlers: {
        search: searchAtendimentos,
        read: readAtendimento,
        create: createAtendimento,
        update: updateAtendimento,
        delete: deleteAtendimento,
    },
    formFields,
    parseListState,
    serializeListState,
    listLayout: atendimentosListLayout,
    detailLayout: atendimentosDetailLayout,
});

registerModule(atendimentosModule);
