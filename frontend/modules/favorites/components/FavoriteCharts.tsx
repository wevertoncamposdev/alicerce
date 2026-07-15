"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
import type { FavoriteEntity, FavoriteChartsProps } from "../types"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
    total: {
        label: "Favoritos",
        color: "var(--chart-1)",
    },
} satisfies ChartConfig

export function FavoriteCharts({
    favorites,
}: FavoriteChartsProps) {

    const chartData = React.useMemo(() => {
        const grouped = new Map<string, number>()

        favorites.forEach((favorite) => {
            const date = favorite.createdAt.split("T")[0]

            grouped.set(
                date,
                (grouped.get(date) ?? 0) + 1
            )
        })

        return Array.from(grouped.entries())
            .map(([date, total]) => ({
                date,
                total,
            }))
            .sort((a, b) =>
                new Date(a.date).getTime() -
                new Date(b.date).getTime()
            )
    }, [favorites])

    const totalFavorites = favorites.length

    const favoritesToday = React.useMemo(() => {
        const today = new Date().toISOString().split("T")[0]

        return favorites.filter(
            (favorite) =>
                favorite.createdAt.split("T")[0] === today
        ).length
    }, [favorites])

    const favoritesYesterday = React.useMemo(() => {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]

        return favorites.filter(
            (favorite) =>
                favorite.createdAt.split("T")[0] === yesterday
        ).length
    }, [favorites])

    return (
        <Card className="py-4 sm:py-0">

            <CardHeader className="flex flex-col items-stretch border-b p-0 sm:flex-row">

                <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4">
                    <CardTitle>Favoritos</CardTitle>

                    <CardDescription>
                        Crescimento dos favoritos cadastrados ao longo do tempo.
                    </CardDescription>
                </div>

                <div className="flex">

                    <div className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 sm:border-l sm:border-t-0">
                        <span className="text-xs text-muted-foreground">
                            Total
                        </span>

                        <span className="text-3xl font-bold">
                            {totalFavorites}
                        </span>
                    </div>

                    <div className="flex flex-1 flex-col justify-center gap-1 border-t border-l px-6 py-4 sm:border-t-0">
                        <span className="text-xs text-muted-foreground">
                            Ontem
                        </span>

                        <span className="text-3xl font-bold">
                            {favoritesYesterday}
                        </span>
                    </div>

                    <div className="flex flex-1 flex-col justify-center gap-1 border-t border-l px-6 py-4 sm:border-t-0">
                        <span className="text-xs text-muted-foreground">
                            Hoje
                        </span>

                        <span className="text-3xl font-bold">
                            {favoritesToday}
                        </span>
                    </div>

                </div>

            </CardHeader>

            <CardContent className="px-2 sm:p-6">

                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[250px] w-full"
                >
                    <LineChart
                        accessibilityLayer
                        data={chartData}
                        margin={{
                            left: 12,
                            right: 12,
                        }}
                    >
                        <CartesianGrid vertical={false} />

                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value) => {
                                return new Date(value).toLocaleDateString(
                                    "pt-BR",
                                    {
                                        day: "2-digit",
                                        month: "short",
                                    }
                                )
                            }}
                        />

                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) => {
                                        return new Date(value).toLocaleDateString(
                                            "pt-BR",
                                            {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                            }
                                        )
                                    }}
                                />
                            }
                        />

                        <Line
                            dataKey="total"
                            type="monotone"
                            stroke="var(--color-total)"
                            strokeWidth={2}
                            dot={false}
                        />

                    </LineChart>
                </ChartContainer>

            </CardContent>

        </Card>
    )
}