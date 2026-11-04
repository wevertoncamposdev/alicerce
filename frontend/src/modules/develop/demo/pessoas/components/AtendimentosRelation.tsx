"use client";

import * as React from "react";
import RelationCrudHost from "@core/components/DetailView/RelationView/RelationCrudHost";
import { buildColumns } from "@core/components/Layout/column-builder";
import type { ColumnConfig } from "@core/registry/types";
import { AtendimentoTipoEnum, AtendimentoSituacaoEnum } from "@modules/develop/demo/_shared/enums";
import type { AtendimentoTipo, AtendimentoSituacao } from "@modules/develop/demo/_shared/types";

export type AtendimentoRelationRow = {
    dataFormatada: string;
    tipo: AtendimentoTipo;
    situacao: AtendimentoSituacao;
    href: string;
};

const COLUMNS: ColumnConfig<AtendimentoRelationRow>[] = [
    { key: "dataFormatada", label: "Data", type: "relation", href: (r) => r.href },
    { key: "tipo", label: "Tipo", type: "badge", enumDef: AtendimentoTipoEnum },
    { key: "situacao", label: "Situação", type: "badge", enumDef: AtendimentoSituacaoEnum },
];

export function AtendimentosRelation({ rows }: { rows: AtendimentoRelationRow[] }) {
    const columns = React.useMemo(() => buildColumns(COLUMNS), []);

    return (
        <RelationCrudHost
            columns={columns}
            initialData={rows}
            emptyMessage="Nenhum atendimento registrado."
        />
    );
}
