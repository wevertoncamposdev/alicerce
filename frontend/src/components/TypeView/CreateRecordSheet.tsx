"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@components/ui/sheet";
import { CreateSheetProvider } from "@/contexts/create-sheet-context";

/**
 * Casca do fluxo de criação — "criar" deixou de ser um modo de visualização
 * do ViewSwitcher (ver ViewSwitcher.tsx) e passou a ser este botão + Sheet
 * lateral. `children` é o que o módulo já monta em `listLayout.form(ctx)`
 * (o mesmo <FormView mode="create" .../> de sempre) — este componente só
 * fornece a casca visual e o fechamento automático ao criar com sucesso
 * (via CreateSheetProvider, que o FormView consome internamente).
 */
export function CreateRecordSheet({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    const [open, setOpen] = React.useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button type="button" variant="default" size="sm" className="gap-1">
                    <Plus className="size-4" />
                    Novo
                </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Novo registro — {label}</SheetTitle>
                    <SheetDescription>Preencha os campos abaixo para criar um novo registro.</SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-4">
                    <CreateSheetProvider onCreateSuccess={() => setOpen(false)}>{children}</CreateSheetProvider>
                </div>
            </SheetContent>
        </Sheet>
    );
}
