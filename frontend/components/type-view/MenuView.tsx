"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { TypeViewMode } from "./TypeView";
import { LayoutList, LayoutGrid, LineChart, FileText, FormIcon } from "lucide-react";

const VIEW_OPTIONS: { value: TypeViewMode; label: string; icon: React.ReactNode }[] = [
    { value: "form", label: "Form", icon: <FormIcon className="w-4 h-4" /> },
    { value: "list", label: "List", icon: <LayoutList className="w-4 h-4" /> },
    { value: "cards", label: "Cards", icon: <LayoutGrid className="w-4 h-4" /> },
    { value: "graph", label: "Graph", icon: <LineChart className="w-4 h-4" /> },
    { value: "text", label: "Text", icon: <FileText className="w-4 h-4" /> },
];

export function MenuView({ current }: { current: TypeViewMode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function handleChange(next: TypeViewMode) {
        const params = new URLSearchParams(searchParams);
        params.set("view", next);
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <div className="flex items-center gap-1 rounded-md border p-1 shadow-sm">
            {VIEW_OPTIONS.map((option) => (
                <button
                    key={option.value}
                    onClick={() => handleChange(option.value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${current === option.value ? "bg-gray-200 text-black" : "hover:bg-gray-100"
                        }`}
                >
                    {option.icon}
                </button>
            ))}
        </div>
    );
}