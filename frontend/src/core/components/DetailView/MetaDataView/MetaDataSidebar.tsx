'use client';

import * as React from "react";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@components/ui/button";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@components/ui/drawer";

const defaultTrigger = (
    <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-between"
        aria-label="Abrir metadados"
    >
        <span>Metadados</span>
        <ChevronRight className="size-4" />
    </Button>
);

export function MetaDataSidebar({
    children,
    trigger = defaultTrigger,
}: {
    children: React.ReactNode;
    /** Modo compacto (ícone, no header da detail page) substitui o botão padrão de texto. */
    trigger?: React.ReactNode;
}) {
    const [open, setOpen] = React.useState(false);

    return (
        <Drawer open={open} onOpenChange={setOpen} direction="right">
            <DrawerTrigger asChild>{trigger}</DrawerTrigger>

            <DrawerContent className="sm:max-w-md">
                <DrawerHeader className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                        <DrawerTitle>Metadados</DrawerTitle>
                        <DrawerDescription>Contexto e auditoria do registro.</DrawerDescription>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Fechar metadados"
                        onClick={() => setOpen(false)}
                    >
                        <X className="size-4" />
                    </Button>
                </DrawerHeader>

                <div className="max-h-[80vh] overflow-y-auto px-4 pb-4">{children}</div>
            </DrawerContent>
        </Drawer>
    );
}