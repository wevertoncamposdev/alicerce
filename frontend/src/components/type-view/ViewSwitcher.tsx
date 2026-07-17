"use client";

import {
    ToggleGroup,
    ToggleGroupItem,
} from "@components/ui/toggle-group";

import {
    LayoutGrid,
    LayoutList,
    LineChart,
    FileText,
    FormInput,
} from "lucide-react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TypeViewMode } from "@/components/Type-View/TypeView";

const VIEW_OPTIONS = [
    {
        value: "form",
        icon: <FormInput className="h-4 w-4" />,
    },
    {
        value: "list",
        icon: <LayoutList className="h-4 w-4" />,
    },
    {
        value: "cards",
        icon: <LayoutGrid className="h-4 w-4" />,
    },
    {
        value: "graph",
        icon: <LineChart className="h-4 w-4" />,
    },
    {
        value: "text",
        icon: <FileText className="h-4 w-4" />,
    },
] as const;

export function ViewSwitcher({
    current,
}: {
    current: TypeViewMode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function handleChange(next: string) {
        const params = new URLSearchParams(searchParams);

        params.set("view", next);

        router.push(
            `${pathname}?${params.toString()}`
        );
    }

    return (
        <ToggleGroup
            type="single"
            value={current}
            onValueChange={(value) => {
                if (value) {
                    handleChange(value);
                }
            }}
        >
            {VIEW_OPTIONS.map((option) => (
                <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    aria-label={option.value}
                >
                    {option.icon}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}