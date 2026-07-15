"use client";

import React from "react";

interface GridViewProps<TData> {
    data: TData[];
    renderItem: (item: TData, index: number) => React.ReactNode;
    isLoading?: boolean;
    loadingMessage?: string;
    emptyMessage?: string;
    className?: string;
}

export function GridView<TData>({
    data,
    renderItem,
    isLoading = false,
    loadingMessage = "Carregando...",
    emptyMessage = "Nenhum resultado.",
    className,
}: GridViewProps<TData>) {
    if (isLoading) {
        return (
            <div className="rounded-md border px-4 py-6 text-sm text-zinc-500">
                {loadingMessage}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="rounded-md border px-4 py-6 text-sm text-zinc-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className={className ?? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
            {data.map((item, index) => (
                <React.Fragment key={index}>{renderItem(item, index)}</React.Fragment>
            ))}
        </div>
    );
}
