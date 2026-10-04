"use client";

// modules/develop/components/DevelopDocsNav.tsx
// Navegação lateral fixa com destaque automático da seção visível (scroll-spy).
// Client Component isolado — o restante da página de docs pode continuar
// sendo renderizado no servidor (mesma regra de fronteira RSC usada nos módulos de dado).

import { useEffect, useState } from "react";
import { cn } from "@lib/utils";

export type DocNavGroup = {
    title: string;
    items: { id: string; label: string }[];
};

export function DevelopDocsNav({ groups }: { groups: DocNavGroup[] }) {
    const allIds = groups.flatMap((g) => g.items.map((i) => i.id));
    const [activeId, setActiveId] = useState<string>(allIds[0] ?? "");

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

                if (visible[0]) {
                    setActiveId(visible[0].target.id);
                }
            },
            { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
        );

        allIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <nav className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-60 shrink-0 overflow-y-auto pr-2 lg:block">
            {groups.map((group) => (
                <div key={group.title} className="mb-5">
                    <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.title}
                    </p>
                    <ul className="space-y-0.5">
                        {group.items.map((item) => (
                            <li key={item.id}>
                                <a
                                    href={`#${item.id}`}
                                    className={cn(
                                        "block rounded-md px-2 py-1.5 text-sm transition-colors",
                                        activeId === item.id
                                            ? "bg-primary/10 font-medium text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                    )}
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </nav>
    );
}
