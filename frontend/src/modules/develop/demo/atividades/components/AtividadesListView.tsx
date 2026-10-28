"use client";

import { ListView } from "@components/TypeView/ListView/ListView";
import { atividadeColumns } from "@modules/develop/demo/atividades/components/columns";
import type { Atividade } from "@modules/develop/demo/atividades/types/types";
import type { SearchResult, SortSpec } from "@core/data-provider/types";

type AtividadesListViewProps = {
    data: Atividade[];
    pagination: SearchResult<Atividade>["pagination"];
    sort?: SortSpec[];
};

export function AtividadesListView({ data, pagination, sort }: AtividadesListViewProps) {
    return (
        <ListView
            data={data}
            columns={atividadeColumns}
            detail="/develop/demo/atividades"
            pagination={pagination}
            sort={sort}
        />
    );
}
