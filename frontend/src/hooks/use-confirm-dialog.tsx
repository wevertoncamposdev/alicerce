"use client";

// Substitui `window.confirm` por um AlertDialog real, mantendo a mesma
// ergonomia imperativa (`if (!(await confirm({...}))) return;`) que o código
// já usava antes — só troca o confirm nativo do browser por um Dialog
// consistente com o design system. `dialog` precisa ser renderizado uma vez
// no componente que chama `confirm`.
import * as React from "react";
import { ConfirmDialog } from "@components/ui/confirm-dialog";

type ConfirmOptions = {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
};

export function useConfirmDialog() {
    const [pending, setPending] = React.useState<{
        options: ConfirmOptions;
        resolve: (value: boolean) => void;
    } | null>(null);

    const confirm = React.useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setPending({ options, resolve });
        });
    }, []);

    const dialog = pending ? (
        <ConfirmDialog
            open
            onOpenChange={(open) => {
                if (!open) {
                    pending.resolve(false);
                    setPending(null);
                }
            }}
            title={pending.options.title}
            description={pending.options.description}
            confirmLabel={pending.options.confirmLabel}
            cancelLabel={pending.options.cancelLabel}
            destructive={pending.options.destructive}
            onConfirm={() => {
                pending.resolve(true);
                setPending(null);
            }}
        />
    ) : null;

    return { confirm, dialog };
}
