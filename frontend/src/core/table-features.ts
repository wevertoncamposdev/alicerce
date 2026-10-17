import { columnOrderingFeature, columnVisibilityFeature, rowSortingFeature, sortFns, tableFeatures } from "@tanstack/react-table";

/**
 * TanStack Table v9 exige declarar features explicitamente (antes, v8
 * aceitava getCoreRowModel/getSortedRowModel/getPaginationRowModel soltos
 * em cada chamada de useReactTable). Um único `tableFeatures()`
 * compartilhado por toda tabela do app garante que `AppTableFeatures` seja
 * o mesmo tipo em toda `ColumnDef<AppTableFeatures, TData>` e em toda
 * chamada de `useTable()` — mesmo em tabelas que não usam sorting (o core
 * row model vem de graça sempre, sem precisar declarar nada: ver
 * `createCoreRowModel` em `coreRowModelsFeature.utils.ts` do pacote).
 *
 * Paginação não entra aqui de propósito: toda paginação deste app é
 * server-side (ver ListView.tsx) — não existe `rowPaginationFeature`
 * nem `createPaginatedRowModel()` em lugar nenhum.
 */
export const appTableFeatures = tableFeatures({
    rowSortingFeature,
    sortFns,
    // `row.getVisibleCells()`/`cell`/`header` helpers que todo renderer deste
    // app já usa (ver ListView/RelationCrudHost/RelationTablePanel) vêm
    // desta feature — nenhuma coluna aqui é escondida de fato, mas a API de
    // "pegar as células na ordem certa" mora aqui mesmo sem uso de toggle.
    columnVisibilityFeature,
    // `column.getIndex()` — usado por RelationCrudHost pra saber se uma
    // célula é a primeira da linha (decide se ela vira link).
    columnOrderingFeature,
});

export type AppTableFeatures = typeof appTableFeatures;
