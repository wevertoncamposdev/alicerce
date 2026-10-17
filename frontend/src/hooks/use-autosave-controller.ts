'use client';

import * as React from "react";

type UseAutoSaveControllerOptions<TDraft extends object> = {
    draft: TDraft;
    enabled?: boolean;
    onSave: (draft: TDraft) => Promise<TDraft>;
    onError?: (error: unknown) => void;
};

export function useAutoSaveController<TDraft extends object>({
    draft,
    enabled = true,
    onSave,
    onError,
}: UseAutoSaveControllerOptions<TDraft>) {
    const [saving, setSaving] = React.useState(false);
    const draftRef = React.useRef(draft);
    const lastSavedRef = React.useRef<TDraft>(draft);
    const queuedRef = React.useRef<TDraft | null>(null);
    const savingRef = React.useRef(false);

    React.useEffect(() => {
        draftRef.current = draft;
    }, [draft]);

    // Drena a fila com um loop, não recursão — chamar a própria função
    // memoizada de dentro dela mesma impede o React Compiler de otimizar o
    // hook (ele não consegue provar que a referência capturada no closure
    // continua a mesma após a otimização). O loop alcança exatamente o
    // mesmo efeito (reprocessa o que foi enfileirado durante o save
    // anterior, inclusive depois de um erro) sem a auto-referência.
    const commitDraftAsync = React.useCallback(async () => {
        if (!enabled) return;
        const candidate = draftRef.current;

        if (JSON.stringify(candidate) === JSON.stringify(lastSavedRef.current)) {
            return;
        }

        if (savingRef.current) {
            queuedRef.current = candidate;
            return;
        }

        savingRef.current = true;
        setSaving(true);

        let current: TDraft | null = candidate;
        while (current) {
            try {
                const saved = await onSave(current);
                lastSavedRef.current = saved;
            } catch (error) {
                onError?.(error);
            }
            current = queuedRef.current;
            queuedRef.current = null;
        }

        savingRef.current = false;
        setSaving(false);
    }, [enabled, onSave, onError]);

    const commitField = React.useCallback(() => {
        void commitDraftAsync();
    }, [commitDraftAsync]);

    return { saving, commitField };
}