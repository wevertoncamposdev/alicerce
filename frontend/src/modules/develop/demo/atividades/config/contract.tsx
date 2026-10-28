import { Info, FileText, Users } from "lucide-react";
import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, ListLayout } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { createRecordFormAction } from "@core/registry/actions";

import { FormView } from "@components/TypeView/FormView/FormView";
import { ShowcaseRelationTable } from "@modules/develop/showcase/ShowcaseRelationTable";
import { AtividadesListView } from "@modules/develop/demo/atividades/components/AtividadesListView";

import { searchAtividades, readAtividade, createAtividade, updateAtividade, deleteAtividade } from "./provider";
import { PESSOAS, VINCULOS } from "@modules/develop/demo/_shared/seed-data";
import type { Atividade } from "../types/types";

// U1 (docs/PLAN-fundacao-ux.md): seções só de leitura, mesmo motivo do
// módulo Pessoas (ver `pessoas/config/contract.tsx`) — demo nunca entra
// em `alicerce.config.ts`/`bootstrap.ts`, então `editable: true` nunca
// resolveria permissão de verdade.
const formFields = [
    { name: "nome" as const, label: "Nome", type: "text" as const, required: true, primary: true },
    { name: "categoria" as const, label: "Categoria", type: "text" as const },
    { name: "diaHorario" as const, label: "Dia/Horário", type: "text" as const },
    { name: "responsavel" as const, label: "Responsável", type: "text" as const },
    {
        name: "status" as const,
        label: "Status",
        type: "select" as const,
        options: [{ label: "Ativa", value: "ATIVA" }, { label: "Inativa", value: "INATIVA" }],
    },
    { name: "descricao" as const, label: "Descrição", type: "textarea" as const },
];

const { parseListState, serializeListState } = createListQueryState();

const createAtividadeAction = createRecordFormAction.bind(null, "demo-atividades", formFields);

const atividadesListLayout: ListLayout<Atividade> = {
    list: ({ data, pagination, searchArgs }) => (
        <AtividadesListView data={data} pagination={pagination} sort={searchArgs.sort} />
    ),
    form: () => <FormView<Atividade> mode="create" fields={formFields} createAction={createAtividadeAction} />,
};

const STATUS_LABEL: Record<Atividade["status"], string> = { ATIVA: "Ativa", INATIVA: "Inativa" };

const atividadesDetailLayout: DetailLayout<Atividade> = {
    header: ({ record }) => ({
        title: record.nome,
        subtitle: [STATUS_LABEL[record.status], record.categoria],
        avatar: { fallback: record.nome.slice(0, 2).toUpperCase() },
    }),
    sections: [
        {
            key: "detalhes",
            title: "Detalhes",
            icon: Info,
            column: 1,
            fields: ["categoria", "diaHorario", "responsavel"],
        },
        {
            key: "descricao",
            title: "Descrição",
            icon: FileText,
            column: 2,
            fields: ["descricao"],
        },
    ],
    relations: ({ record }) => {
        const participantesRows = VINCULOS.filter((v) => v.atividadeId === record.id).map((vinculo) => {
            const pessoa = PESSOAS.find((p) => p.id === vinculo.pessoaId);
            return {
                nome: pessoa?.nome ?? vinculo.pessoaId,
                tipo: vinculo.tipo,
                periodo: vinculo.periodoFim
                    ? `${vinculo.periodoInicio} – ${vinculo.periodoFim}`
                    : `desde ${vinculo.periodoInicio}`,
                href: `/develop/demo/pessoas/${vinculo.pessoaId}`,
            };
        });

        return [
            {
                key: "participantes",
                label: "Participantes",
                icon: Users,
                count: participantesRows.length,
                content: (
                    <ShowcaseRelationTable
                        columns={[
                            { key: "nome", header: "Pessoa" },
                            { key: "tipo", header: "Vínculo" },
                            { key: "periodo", header: "Período" },
                        ]}
                        rows={participantesRows}
                        searchPlaceholder="Pesquisar participantes"
                        addLabel="Novo vínculo"
                        emptyMessage="Nenhum participante vinculado."
                        linkKey="href"
                    />
                ),
            },
        ];
    },
};

export const atividadesModule = defineRecordModule<Atividade>({
    model: "demo-atividades",
    label: "Atividades (demo)",
    views: ["list"],
    defaultView: "list",
    dataHandlers: {
        search: searchAtividades,
        read: readAtividade,
        create: createAtividade,
        update: updateAtividade,
        delete: deleteAtividade,
    },
    formFields,
    parseListState,
    serializeListState,
    listLayout: atividadesListLayout,
    detailLayout: atividadesDetailLayout,
});

registerModule(atividadesModule);
