// components/PainelSearchShell/FilterSelect.tsx
"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function FilterSelect({ paramKey, options }: { paramKey: string; options: string[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function handleChange(value: string) {
        const params = new URLSearchParams(searchParams);
        value ? params.set(paramKey, value) : params.delete(paramKey);
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <select defaultValue={searchParams.get(paramKey) ?? ""} onChange={(e) => handleChange(e.target.value)}>
            <option value="">Todos</option>
            {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    );
}