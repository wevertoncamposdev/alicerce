"use client";

import React from "react";

interface PainelSearchShellProps {
    title?: string;
    filters?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
}

export function PainelSearchShell({ title, filters, actions, children }: PainelSearchShellProps) {
    return (
        <section className="space-y-3 rounded-md border bg-white/80 p-4">
            {(title || filters || actions) ? (
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                        {title ? <h3 className="text-base font-semibold text-zinc-900">{title}</h3> : null}
                        {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
                    </div>
                    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
                </div>
            ) : null}

            <div>{children}</div>
        </section>
    );
}
