"use client";

import * as React from "react";
import RelationCrudHost from "@core/components/DetailView/RelationView/RelationCrudHost";
import { buildColumns } from "@core/components/Layout/column-builder";
import type { ColumnConfig } from "@core/registry/types";

export type AtividadeVinculoRow = {
    nome: string;
    tipo: string;
    periodo: string;
    href: string;
};

const COLUMNS: ColumnConfig<AtividadeVinculoRow>[] = [
    { key: "nome", label: "Atividade", type: "relation", href: (r) => r.href },
    { key: "tipo", label: "Vínculo", type: "text" },
    { key: "periodo", label: "Período", type: "text" },
];

export function AtividadesRelation({ rows }: { rows: AtividadeVinculoRow[] }) {
    const columns = React.useMemo(() => buildColumns(COLUMNS), []);

    return (
        <RelationCrudHost
            columns={columns}
            initialData={rows}
            emptyMessage="Nenhuma atividade vinculada."
        />
    );
}
