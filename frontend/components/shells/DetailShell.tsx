"use client";

import React from "react";

interface DetailShellProps {
    title: string;
    description?: string;
    toolbar?: React.ReactNode;
    error?: string | null;
    children: React.ReactNode;
}

export function DetailShell({ title, description, toolbar, error, children }: DetailShellProps) {
    return (
        <section className="space-y-5">
            <header className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h2>
                    {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
                </div>
                {toolbar ? <div className="flex items-center gap-2">{toolbar}</div> : null}
            </header>

            {error ? (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            <div className="space-y-4">{children}</div>
        </section>
    );
}
