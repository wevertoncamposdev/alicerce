"use client";

import React from "react";

interface SideShellProps {
    title: string;
    description?: string;
    children: React.ReactNode;
}

export function SideShell({ title, description, children }: SideShellProps) {
    return (
        <aside className="space-y-3 rounded-md border bg-white/80 p-4">
            <div>
                <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
                {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
            </div>
            <div className="space-y-3">{children}</div>
        </aside>
    );
}
