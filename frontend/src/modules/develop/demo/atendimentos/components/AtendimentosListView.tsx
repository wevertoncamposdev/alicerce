"use client";

import { ListView } from "@components/TypeView/ListView/ListView";
import { atendimentoColumns } from "@modules/develop/demo/atendimentos/components/columns";
import type { Atendimento } from "@modules/develop/demo/atendimentos/types/types";
import type { SearchResult, SortSpec } from "@core/data-provider/types";

type AtendimentosListViewProps = {
    data: Atendimento[];
    pagination: SearchResult<Atendimento>["pagination"];
    sort?: SortSpec[];
};

export function AtendimentosListView({ data, pagination, sort }: AtendimentosListViewProps) {
    return (
        <ListView
            data={data}
            columns={atendimentoColumns}
            detail="/develop/demo/atendimentos"
            pagination={pagination}
            sort={sort}
        />
    );
}
