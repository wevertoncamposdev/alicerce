'use client';

import * as React from "react";

type UseAutoSaveControllerOptions<TDraft extends object> = {
    draft: TDraft;
    enabled?: boolean;
    onSave: (patch: Partial<TDraft>) => Promise<TDraft>;
    onError?: (error: unknown) => void;
};

// D2 (docs/PLAN-fundacao-ux.md): manda só o que mudou desde o último save,
// nunca a seção inteira — campo nunca tocado não deveria disputar validação
// de novo. Normaliza "" <-> null dos dois lados antes de comparar: o valor
// que sai pro backend pra um campo esvaziado é sempre `null` (nunca ""), e
// isso não pode continuar marcando o mesmo campo como "mudou" pra sempre só
// porque o input (que só conhece string) volta a mostrar "".
function normalizeEmpty(value: unknown): unknown {
    return value === "" ? null : value;
}

function diffDraft<TDraft extends object>(previous: TDraft, next: TDraft): Partial<TDraft> {
    const patch: Partial<TDraft> = {};
    for (const key of Object.keys(next) as (keyof TDraft)[]) {
        const normalizedNext = normalizeEmpty(next[key]);
        const normalizedPrevious = normalizeEmpty(previous[key]);
        if (JSON.stringify(normalizedNext) === JSON.stringify(normalizedPrevious)) continue;
        patch[key] = normalizedNext as TDraft[keyof TDraft];
    }
    return patch;
}

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

        if (Object.keys(diffDraft(lastSavedRef.current, candidate)).length === 0) {
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
            const patch = diffDraft(lastSavedRef.current, current);
            if (Object.keys(patch).length > 0) {
                try {
                    const saved = await onSave(patch);
                    lastSavedRef.current = saved;
                } catch (error) {
                    onError?.(error);
                }
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