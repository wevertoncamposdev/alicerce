"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@components/DataTable";

interface TableViewProps<TData> {
    columns: ColumnDef<TData, any>[];
    data: TData[];
    isLoading?: boolean;
    loadingMessage?: string;
    emptyMessage?: string;
}

export function TableView<TData>({
    columns,
    data,
    isLoading,
    loadingMessage,
    emptyMessage,
}: TableViewProps<TData>) {
    return (
        <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            loadingMessage={loadingMessage}
            emptyMessage={emptyMessage}
        />
    );
}
