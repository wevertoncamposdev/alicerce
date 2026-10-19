import type { DetailSection } from "@core/registry/types";

/**
 * Agrupa seções por coluna (1/2/3) e resolve a classe de grid — extraído de
 * `DetailSections` e `DetailCreateScreen` (eram idênticos, caractere por
 * caractere). Nunca renderiza coluna vazia (docs/ui/detail-page.md §3).
 */
export function groupSectionsByColumn<T>(sections: DetailSection<T>[]) {
    const columns = new Map<number, DetailSection<T>[]>();
    for (const section of sections) {
        const col = section.column ?? 1;
        if (!columns.has(col)) columns.set(col, []);
        columns.get(col)!.push(section);
    }
    const usedColumns = [...columns.keys()].sort((a, b) => a - b);
    const gridColsClass =
        usedColumns.length >= 3 ? "lg:grid-cols-3" : usedColumns.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-1";

    return { columns, usedColumns, gridColsClass };
}
