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