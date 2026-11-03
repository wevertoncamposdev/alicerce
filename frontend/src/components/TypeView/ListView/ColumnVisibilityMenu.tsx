"use client";

import { Columns3 } from "lucide-react";
import { Button } from "@components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import type { Table } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";

// U3 (docs/PLAN-fundacao-ux.md): escolha de colunas visíveis. `table`
// já carrega `columnVisibilityFeature` (core/table-features.ts) — só
// falta esta UI em cima. Estado mora na URL, não aqui (ver `ListView.
// tsx`: `hiddenColumns=` é lido/escrito lá, este componente só lê o
// `table` que já reflete isso).
export function ColumnVisibilityMenu<T extends object>({ table }: { table: Table<AppTableFeatures, T> }) {
    const columns = table.getAllLeafColumns().filter((column) => column.getCanHide());

    if (columns.length === 0) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                    <Columns3 className="size-4" />
                    Colunas
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((column) => (
                    <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(checked) => column.toggleVisibility(checked === true)}
                        onSelect={(e) => e.preventDefault()}
                    >
                        {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
