export type SortDirection = "asc" | "desc";
export type SortSpec = { field: string; direction: SortDirection };
export type PaginationSpec = { pageIndex: number; pageSize: number };

/**
 * @SearchArgs
 * Define os argumentos que podem ser passados para uma operação de busca genérica. Ele inclui:
 */
export type SearchArgs = {
    searchText?: string;
    filters?: Record<string, unknown>;   // equivalente simplificado do "domain" do projeto real
    groupBy?: string[];
    sort?: SortSpec[];
    pagination?: PaginationSpec;
};

/**
 * @SearchResult
 * O "resultado" de busca. Standardiza o que qualquer tela pode receber, independente da feature:
 */
export type SearchResult<T> = {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
};
