// components/Layout/Breadcrumbs.tsx
import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
    label: string;
    href?: string;
};

/** Usado pelo AppTopbar no lugar do título quando a tela declara `breadcrumb`. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
    const lastIndex = items.length - 1;

    return (
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center text-sm">
            {items.map((item, index) => {
                const isLast = index === lastIndex;
                return (
                    <React.Fragment key={index}>
                        {index > 0 ? (
                            <ChevronRight className="mx-1 size-4 shrink-0 text-muted-foreground max-sm:hidden" />
                        ) : null}
                        {isLast ? (
                            <span className="truncate text-page-title">{item.label}</span>
                        ) : item.href ? (
                            <Link
                                href={item.href}
                                className="shrink-0 text-muted-foreground hover:text-foreground max-sm:hidden"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span className="shrink-0 text-muted-foreground max-sm:hidden">{item.label}</span>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
