"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { TableView } from "./TableView";
import { GridView } from "./GridView";

type TypeViewMode = "table" | "grid";

interface TypeViewProps<TData> {
    mode: TypeViewMode;
    data: TData[];
    columns?: ColumnDef<TData, any>[];
    renderGridItem?: (item: TData, index: number) => React.ReactNode;
    isLoading?: boolean;
    loadingMessage?: string;
    emptyMessage?: string;
    gridClassName?: string;
}

export function TypeViewOld<TData>({
    mode,
    data,
    columns,
    renderGridItem,
    isLoading,
    loadingMessage,
    emptyMessage,
    gridClassName,
}: TypeViewProps<TData>) {
    if (mode === "table") {
        if (!columns) {
            throw new Error("TypeView table exige columns.");
        }

        return (
            <TableView
                columns={columns}
                data={data}
                isLoading={isLoading}
                loadingMessage={loadingMessage}
                emptyMessage={emptyMessage}
            />
        );
    }

    if (!renderGridItem) {
        throw new Error("TypeView grid exige renderGridItem.");
    }

    return (
        <GridView
            data={data}
            renderItem={renderGridItem}
            isLoading={isLoading}
            loadingMessage={loadingMessage}
            emptyMessage={emptyMessage}
            className={gridClassName}
        />
    );
}

export { TableView, GridView };
