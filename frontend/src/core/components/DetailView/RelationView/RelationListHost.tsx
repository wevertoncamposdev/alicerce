'use client';

import * as React from "react";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Plus } from "lucide-react";

type RelationListHostProps = {
    searchText: string;
    onSearchTextChange: (next: string) => void;
    searchPlaceholder?: string;
    filteredCount: number;
    addLabel?: string;
    onAdd: () => void;
    children: React.ReactNode;
};

export function RelationListHost({
    searchText,
    onSearchTextChange,
    searchPlaceholder = "Pesquisar",
    filteredCount,
    addLabel = "Adicionar",
    onAdd,
    children,
}: RelationListHostProps) {
    return (
        <section className="space-y-3">
            <div className="flex items-center gap-3">
                <Input
                    value={searchText}
                    onChange={(e) => onSearchTextChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="max-w-xs"
                />
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                    {filteredCount}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={onAdd} className="ml-auto gap-1">
                    <Plus className="size-3.5" />
                    {addLabel}
                </Button>
            </div>
            {children}
        </section>
    );
}