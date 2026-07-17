// components/type-view/graph-view/FavoritesGraphView.tsx — ESPECÍFICO de favorites
"use client";
import * as React from "react";
import { GraphView } from "@/components/TypeView/GraphView/GraphView";
import type { FavoriteEntity } from "@/modules/favorites/types/types";

const chartConfig = { total: { label: "Favoritos", color: "var(--chart-1)" } };

export function FavoritesGraphView({ data }: { data: FavoriteEntity[] }) {
    const chartData = React.useMemo(() => {
        const grouped = new Map<string, number>();
        data.forEach((f) => {
            const date = f.createdAt.split("T")[0];
            grouped.set(date, (grouped.get(date) ?? 0) + 1);
        });
        return Array.from(grouped.entries())
            .map(([date, total]) => ({ date, total }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data]);

    return (
        <GraphView
            data={chartData}
            title="Favoritos"
            description="Crescimento dos favoritos cadastrados ao longo do tempo."
            config={chartConfig}
        />
    );
}