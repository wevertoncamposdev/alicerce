"use client";

import { ListView } from "@components/TypeView/ListView/ListView";
import { pessoaColumns } from "@modules/develop/demo/pessoas/components/columns";
import type { Pessoa } from "@modules/develop/demo/pessoas/types/types";
import type { SearchArgs, SearchResult } from "@core/data-provider/types";

type PessoasListViewProps = {
    data: Pessoa[];
    pagination: SearchResult<Pessoa>["pagination"];
    searchArgs: SearchArgs;
};

export function PessoasListView({ data, pagination, searchArgs }: PessoasListViewProps) {
    return (
        <ListView
            data={data}
            columns={pessoaColumns}
            detail="/develop/demo/pessoas"
            pagination={pagination}
            sort={searchArgs.sort}
            model="demo-pessoas"
            searchArgs={searchArgs}
        />
    );
}
