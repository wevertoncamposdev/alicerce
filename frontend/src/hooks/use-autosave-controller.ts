'use client';

import * as React from "react";

type UseAutoSaveControllerOptions<TDraft extends object> = {
    draft: TDraft;
    enabled?: boolean;
    onSave: (draft: TDraft) => Promise<TDraft>;
    onError?: (error: unknown) => void;
};

/**
 * Versão simplificada do useDetailAutoSaveController (system_development/web-client/detail).
 * Removido: suporte a suspensão por upload de mídia (não existe no nosso caso).
 * Mantido: dedupe por comparação de draft, fila enquanto salva, flag de saving.
 */
export function useAutoSaveController<TDraft extends object>({
    draft,
    enabled = true,
    onSave,
    onError,
}: UseAutoSaveControllerOptions<TDraft>) {
    const [saving, setSaving] = React.useState(false);
    const draftRef = React.useRef(draft);
    const lastSavedRef = React.useRef<TDraft | null>(null);
    const queuedRef = React.useRef<TDraft | null>(null);
    const savingRef = React.useRef(false);

    React.useEffect(() => {
        draftRef.current = draft;
    }, [draft]);

    const commitDraftAsync = React.useCallback(async () => {
        if (!enabled) return;
        const candidate = draftRef.current;

        if (lastSavedRef.current && JSON.stringify(candidate) === JSON.stringify(lastSavedRef.current)) {
            return; // nada mudou desde o último save — evita request redundante
        }

        if (savingRef.current) {
            queuedRef.current = candidate; // já tem um save em voo: enfileira o mais recente
            return;
        }

        savingRef.current = true;
        setSaving(true);
        try {
            const saved = await onSave(candidate);
            lastSavedRef.current = saved;
        } catch (error) {
            onError?.(error);
        } finally {
            savingRef.current = false;
            setSaving(false);

            if (queuedRef.current) {
                const next = queuedRef.current;
                queuedRef.current = null;
                draftRef.current = next;
                void commitDraftAsync();
            }
        }
    }, [enabled, onSave, onError]);

    const commitField = React.useCallback(() => {
        void commitDraftAsync();
    }, [commitDraftAsync]);

    return { saving, commitField };
}