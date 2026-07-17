'use client';

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@components/ui/button";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@components/ui/drawer";

export function MetaDataSidebar({ children }: { children: React.ReactNode }) {
    return (
        <Drawer direction="right">
            <DrawerTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    aria-label="Abrir painel de metadados"
                    className="fixed right-4 top-1 z-10 h-8 w-8 rounded-full"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            </DrawerTrigger>

            <DrawerContent className="h-full w-full max-w-sm ml-auto">
                <DrawerHeader>
                    <DrawerTitle>Metadados</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-4 overflow-y-auto">
                    {children}
                </div>
            </DrawerContent>
        </Drawer>
    );
}