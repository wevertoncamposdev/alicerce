'use client';

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MetaDataSidebar({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(true);

    return (
        <div className="rounded-xl border border-border/60 bg-background/80 shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                <h3 className="text-sm font-semibold text-foreground">Metadados</h3>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={open ? "Ocultar metadados" : "Mostrar metadados"}
                    onClick={() => setOpen((value) => !value)}
                    className="h-7 w-7 rounded-full"
                >
                    {open ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
                </Button>
            </div>

            {open ? <div className="space-y-3 p-4">{children}</div> : null}
        </div>
    );
}