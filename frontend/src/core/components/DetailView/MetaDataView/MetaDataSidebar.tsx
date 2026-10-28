'use client';

import * as React from "react";
import { PanelRight } from "lucide-react";
import { Button } from "@components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@components/ui/drawer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip";

const defaultTrigger = (
    <Button type="button" variant="outline" size="icon" aria-label="Metadados">
        <PanelRight className="size-4" />
    </Button>
);

export function MetaDataSidebar({
    children,
    trigger = defaultTrigger,
}: {
    children: React.ReactNode;
    /** Sobrescreve o botão-ícone padrão, se algum chamador precisar de outro gatilho. */
    trigger?: React.ReactNode;
}) {
    const [open, setOpen] = React.useState(false);

    return (
        <Drawer open={open} onOpenChange={setOpen} direction="right">
            {/* Tooltip precisa envolver o DrawerTrigger (não o contrário): `asChild` só repassa
                onClick/ref pro elemento real quando encadeado nessa ordem — um Provider/Tooltip
                dentro do `trigger` não tem nó DOM próprio pra receber o clique do Drawer. */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Metadados</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Decisão do usuário: sem DrawerHeader/título "Metadados" — informação
                desnecessária pro usuário final (ver docs/ui/detail-page.md §7). Fechar
                continua funcionando via clique fora/Esc (comportamento padrão do Drawer). */}
            <DrawerContent className="sm:max-w-[400px]">
                <div className="min-h-0 mt-4 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
            </DrawerContent>
        </Drawer>
    );
}