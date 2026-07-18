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

            {error ? (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            <div className="space-y-4">{children}</div>
        </section>
    );
}
