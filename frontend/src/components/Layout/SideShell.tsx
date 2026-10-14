import React from "react";

interface SideShellProps {
    title: string;
    description?: string;
    children: React.ReactNode;
}

export function SideShell({ title, description, children }: SideShellProps) {
    return (
        <aside className="space-y-3 rounded-md border border-border bg-card p-4">
            <div>
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                {description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                ) : null}
            </div>
            <div className="space-y-3">{children}</div>
        </aside>
    );
}
