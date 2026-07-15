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

/**
 * @DataProvider
 * Interface que define o contrato para um provedor de dados genérico. Ele abstrai operações comuns de CRUD e busca, permitindo que diferentes implementações possam ser usadas sem alterar a lógica de negócios.
 * 
 * Métodos:
 * - search<T>(model: string, args: SearchArgs): Promise<SearchResult<T>>: Realiza uma busca no modelo especificado com os argumentos fornecidos e retorna um resultado de busca.
 * - read<T>(model: string, id: string): Promise<T>: Lê um registro específico do modelo pelo seu ID.
 * - create<T>(model: string, payload: unknown): Promise<T>: Cria um novo registro no modelo com os dados fornecidos.
 * - update<T>(model: string, id: string, payload: unknown): Promise<T>: Atualiza um registro existente no modelo pelo seu ID com os novos dados fornecidos.
 * - delete(model: string, id: string): Promise<void>: Remove um registro específico do modelo pelo seu ID.
 */
export type DataProvider = {
    search<T>(model: string, args: SearchArgs): Promise<SearchResult<T>>;
    read<T>(model: string, id: string): Promise<T>;
    create<T>(model: string, payload: unknown): Promise<T>;
    update<T>(model: string, id: string, payload: unknown): Promise<T>;
    delete(model: string, id: string): Promise<void>;
};