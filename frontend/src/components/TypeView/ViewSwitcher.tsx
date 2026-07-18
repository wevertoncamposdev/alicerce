// components/TypeView/ViewSwitcher.tsx
"use client";

import { ToggleGroup, ToggleGroupItem } from "@components/ui/toggle-group";
import { LayoutGrid, LayoutList, LineChart, FileText, FormInput, Calendar, ListTree, LucideIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TypeViewMode } from "@/components/TypeView/TypeView";

const ICON_BY_VIEW: Record<string, LucideIcon> = {
    form: FormInput,
    list: LayoutList,
    cards: LayoutGrid,
    graph: LineChart,
    text: FileText,
    calendar: Calendar,
    timeline: ListTree,
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