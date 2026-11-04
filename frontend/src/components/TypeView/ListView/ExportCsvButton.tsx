"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@components/ui/button";
import { fetchRecordsForExport } from "@core/registry/csv-export";
import { formatColumnText } from "@core/components/Layout/column-builder";
import useApiError from "@/hooks/useApiError";
import type { ColumnConfig } from "@core/registry/types";
import type { SearchArgs } from "@core/data-provider/types";

function toCsvField(value: string): string {
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// U3 (docs/PLAN-fundacao-ux.md): exporta o resultado da busca/filtro
// atual (searchArgs já reflete o que está na tela, inclusive os chips
// de QuickFilterChips.tsx). Monta o CSV aqui, não na Server Action —
// `columns` carrega função, não serializa pela fronteira (ver
// core/registry/csv-export.ts). Só aparece pra módulo que declarou
// `ColumnConfig` (ver ListView.tsx) — adoção incremental.
export function ExportCsvButton<T extends object>({
    model,
    columns,
    searchArgs,
}: {
    model: string;
    columns: ColumnConfig<T>[];
    searchArgs: SearchArgs;
}) {
    const [loading, setLoading] = React.useState(false);
    const formatError = useApiError();

    async function handleExport() {
        setLoading(true);
        try {
            const records = await fetchRecordsForExport<T>(model, searchArgs);
            const header = columns.map((column) => toCsvField(column.label)).join(",");
            const rows = records.map((record) =>
                columns.map((column) => toCsvField(formatColumnText(column, record))).join(","),
            );
            // BOM no início — Excel só reconhece UTF-8 sem perguntar com isso,
            // senão acentuação (nome, cidade...) vem ilegível ao abrir.
            // `String.fromCharCode(0xfeff)`, não o caractere literal: já
            // aconteceu de um caractere Unicode digitado direto no fonte
            // vir corrompido ao gravar o arquivo (ver seed-data.ts, U1).
            const BOM = String.fromCharCode(0xfeff);
            const blob = new Blob([`${BOM}${[header, ...rows].join("\n")}`], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${model}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast("Falha ao exportar CSV", { description: formatError(err) });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Exportar CSV
        </Button>
    );
}
