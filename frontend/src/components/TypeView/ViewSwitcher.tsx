// components/TypeView/ViewSwitcher.tsx
"use client";

import { ToggleGroup, ToggleGroupItem } from "@components/ui/toggle-group";
import { LayoutGrid, LayoutList, LineChart, Plus, LucideIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TypeViewMode } from "@components/TypeView/TypeView";

// Só os modos com view real implementada (ver listLayout de cada módulo em
// src/modules/*/config/contract.tsx). Kanban/Calendar/Timeline são Fase 5 do
// AGENTS.md — entram aqui quando o componente existir, não antes.
const ICON_BY_VIEW: Record<string, LucideIcon> = {
    form: Plus,
    list: LayoutList,
    cards: LayoutGrid,
    graph: LineChart,
};

export function ViewSwitcher({ current, views }: { current: TypeViewMode; views: string[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function handleChange(next: string) {
        const params = new URLSearchParams(searchParams);
        params.set("view", next);
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <ToggleGroup type="single" value={current} onValueChange={(v) => v && handleChange(v)}>
            {views.map((view) => {
                const Icon = ICON_BY_VIEW[view] ?? LayoutList;
                return (
                    <ToggleGroupItem key={view} value={view} aria-label={view}>
                        <Icon className="h-4 w-4" />
                    </ToggleGroupItem>
                );
            })}
        </ToggleGroup>
    );
}