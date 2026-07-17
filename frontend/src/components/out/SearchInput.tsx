"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search } from "lucide-react";
import { serializeFavoritesListState } from "@lib/query-state/favorites-query-state";

export function SearchInput({ defaultValue }: { defaultValue?: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleSearch = useDebouncedCallback((value: string) => {
        const params = serializeFavoritesListState(searchParams, { searchText: value });
        router.push(`${pathname}?${params.toString()}`);
    }, 300);

    return (
        <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
                defaultValue={defaultValue}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar favoritos..."
                className="pl-8 pr-3 py-1.5 border rounded-md text-sm w-64"
            />
        </div>
    );
}