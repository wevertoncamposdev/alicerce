import React from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@components/ui/alert";

interface DetailShellProps {
    toolbar?: React.ReactNode;
    error?: string | null;
    children: React.ReactNode;
}

export function DetailShell({ toolbar, error, children }: DetailShellProps) {
    return (
        <section className="space-y-6">
            {toolbar ? <div className="flex items-center justify-end gap-2">{toolbar}</div> : null}

            {error ? (
                <Alert variant="destructive">
                    <AlertCircle />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : null}

            <div className="space-y-4">{children}</div>
        </section>
    );
}
