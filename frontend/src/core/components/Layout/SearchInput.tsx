// components/Layout/SearchInput.tsx
"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search, X } from "lucide-react";
import { Input } from "@components/ui/input";
import { Badge } from "@components/ui/badge";
import { cn } from "@lib/utils";
import { createListQueryState } from "@lib/query-state/list-query-state";

const { serializeListState } = createListQueryState();

export function SearchInput({
    defaultValue,
    resultCount,
    placeholder = "Buscar...",
}: {
    defaultValue?: string;
    resultCount?: number;
    placeholder?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [value, setValue] = React.useState(defaultValue ?? "");
    const [isEditing, setIsEditing] = React.useState(!defaultValue);

    const pushSearch = useDebouncedCallback((next: string) => {
        const params = serializeListState(searchParams, { searchText: next });
        router.push(`${pathname}?${params.toString()}`);
    }, 300);

    function handleChange(next: string) {
        setValue(next);
        pushSearch(next);
    }

    function handleClear() {
        setValue("");
        pushSearch("");
        setIsEditing(true);
    }

    const showChip = !isEditing && value.length > 0;

    // components/Layout/SearchInput.tsx
    return (
        <div
            className={cn(
                "flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-transparent pr-1.5",
                "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 transition-colors",
            )}
        >
            <div className="relative h-full min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                {showChip ? (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex h-full w-full items-center pl-8 pr-2"
                    >
                        <Badge variant="save" className="max-w-full">
                            <span className="truncate">{value}</span>
                        </Badge>
                    </button>
                ) : (
                    <Input
                        autoFocus={isEditing && value.length > 0}
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        onBlur={() => value && setIsEditing(false)}
                        placeholder={placeholder}
                        className="h-full border-0 pl-8 pr-2 shadow-none focus-visible:ring-0"
                    />
                )}
            </div>

            {value ? (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Limpar busca"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            ) : null}

            {resultCount !== undefined ? (
                <Badge variant="muted" className="shrink-0">
                    {resultCount} registro(s)
                </Badge>
            ) : null}
        </div>
    );
}