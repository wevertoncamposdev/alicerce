"use client";

import { ListView } from "@components/TypeView/ListView/ListView";
import { pessoaColumns } from "@modules/develop/demo/pessoas/components/columns";
import type { Pessoa } from "@modules/develop/demo/pessoas/types/types";
import type { SearchResult, SortSpec } from "@core/data-provider/types";

type PessoasListViewProps = {
    data: Pessoa[];
    pagination: SearchResult<Pessoa>["pagination"];
    sort?: SortSpec[];
};

export function PessoasListView({ data, pagination, sort }: PessoasListViewProps) {
    return (
        <ListView
            data={data}
            columns={pessoaColumns}
            detail="/develop/demo/pessoas"
            pagination={pagination}
            sort={sort}
        />
    );
}
