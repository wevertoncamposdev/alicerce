// core/data-provider/rest-handlers.ts
import { apiServer } from "@lib/api-server";
import type { SearchArgs, SearchResult } from "@core/data-provider/types";

type RestSearchResponse<T> = { items: T[]; total: number; page: number; limit: number };

/**
 * Encapsula o search/read/create/update/delete via `apiServer` que cada
 * `modules/<nome>/config/provider.ts` repetia quase byte-a-byte (favorites/
 * examples, roles, permissions, users — ver PLAN.md, Etapa 7.F). O shape
 * devolvido já bate com `RecordModuleDataHandlers<T>`
 * (`core/registry/types.ts`), então pode ir direto em `dataHandlers` de
 * `defineRecordModule`.
 *
 * Cada módulo mantém seus próprios exports nomeados (`searchUsers`,
 * `readUser`, ...) desestruturando o retorno — não só por compatibilidade
 * com quem já importa essas funções pelo nome (ex.: dashboard/page.tsx),
 * mas porque esse é o nome que aparece em stack traces/devtools.
 */
export function createRestDataHandlers<T>(resource: string) {
    return {
        async search(args: SearchArgs): Promise<SearchResult<T>> {
            const response = await apiServer.search<RestSearchResponse<T>>(resource, {
                searchText: args.searchText,
                sort: args.sort,
                pagination: { pageIndex: args.pagination?.pageIndex ?? 0, pageSize: args.pagination?.pageSize ?? 20 },
                filters: args.filters,
            });

            return {
                data: response.items,
                pagination: {
                    total: response.total,
                    page: response.page,
                    limit: response.limit,
                    pages: Math.ceil(response.total / response.limit),
                },
            };
        },

        read(id: string): Promise<T> {
            return apiServer.get<T>(`${resource}/${id}`);
        },

        create(payload: unknown): Promise<T> {
            return apiServer.post<T>(resource, payload);
        },

        update(id: string, payload: unknown): Promise<T> {
            return apiServer.patch<T>(`${resource}/${id}`, payload);
        },

        async delete(id: string): Promise<void> {
            await apiServer.delete(`${resource}/${id}`);
        },
    };
}

/**
 * Extrai o objeto aninhado (`{ role: {...} }`) de cada linha de uma relação
 * N:N e descarta entradas sem `id` — mesma lógica duplicada em
 * users/roles/permissions antes da 7.F.
 */
export function normalizeEntityList<T extends { id?: string }>(rows: unknown, nestedKey: string): T[] {
    if (!Array.isArray(rows)) return [];

    return rows
        .map((row) => (row && typeof row === "object" && nestedKey in row ? (row as Record<string, unknown>)[nestedKey] : row))
        .filter((entry): entry is T => Boolean(entry && typeof entry === "object" && "id" in entry));
}
