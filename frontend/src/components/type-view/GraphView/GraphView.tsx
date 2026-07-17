// components/type-view/graph-view/GraphView.tsx — GENÉRICO, não sabe o que é "favorito"
"use client";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@components/ui/chart";

type TimeSeriesPoint = { date: string; total: number };

export function GraphView({
    data,
    title,
    description,
    config,
}: {
    data: TimeSeriesPoint[];
    title: string;
    description: string;
    config: ChartConfig;
}) {
    return (
        <Card className="py-4 sm:py-0">
            <CardHeader className="p-0">
                <div className="px-6 py-4">
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="px-2 sm:p-6">
                <ChartContainer config={config} className="aspect-auto h-[250px] w-full">
                    <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(v) => new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line dataKey="total" type="monotone" stroke="var(--color-total)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}