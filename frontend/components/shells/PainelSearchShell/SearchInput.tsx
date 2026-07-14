"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

export function SearchInput() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleSearch = useDebouncedCallback((value: string) => {
        const params = new URLSearchParams(searchParams);
        value ? params.set("search", value) : params.delete("search");
        router.push(`${pathname}?${params.toString()}`);
    }, 300);

    return <input placeholder="Buscar..." defaultValue={searchParams.get("search") ?? ""} onChange={(e) => handleSearch(e.target.value)} />;
}