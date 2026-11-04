'use server';

// core/registry/csv-export.ts
//
// U3 (docs/PLAN-fundacao-ux.md): busca até EXPORT_ROW_LIMIT registros
// que batem com a busca/filtro atual (mesma permissão de leitura que
// `search` já checa no backend — nenhum endpoint novo). Só devolve os
// registros crus: formatar em texto (fieldLabel de cada ColumnConfig)
// e montar o CSV acontece no client que chamou (`ExportCsvButton.tsx`)
// porque `ColumnConfig` carrega função (`href`, `avatar.fallback`) —
// não serializa pela fronteira de uma Server Action.
import { createDataProvider } from "@core/data-provider";
import type { SearchArgs } from "@core/data-provider/types";

const EXPORT_ROW_LIMIT = 5000;

export async function fetchRecordsForExport<T>(model: string, searchArgs: SearchArgs): Promise<T[]> {
    const dataProvider = createDataProvider();
    const result = await dataProvider.search<T>(model, {
        ...searchArgs,
        pagination: { pageIndex: 0, pageSize: EXPORT_ROW_LIMIT },
    });
    return result.data;
}
