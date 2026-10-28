'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAutoSaveController } from "@/hooks/use-autosave-controller";
import { autoSaveRecord, createRecordDraftAction } from "@core/registry/actions";
import { validateFormPayload } from "@core/registry/form-validation";
import type { FormFieldConfig } from "@core/registry/types";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";
import { InlineFieldsGrid } from "@components/TypeView/FormView/FormView";

type DraftContextValue = {
    values: Record<string, string>;
    fieldErrors: Record<string, string>;
    saving: boolean;
    onChange: (name: string, value: string) => void;
    onBlur: (name: string) => void;
};

const DraftContext = React.createContext<DraftContextValue | null>(null);

function nextFieldNameAfter<T extends object>(fields: FormFieldConfig<T>[], current: string | null): string | undefined {
    if (!current) return undefined;
    const index = fields.findIndex((field) => field.name === current);
    if (index === -1) return undefined;
    return fields[index + 1]?.name;
}

/**
 * Criação pelo Detail (ADR 0005, "Novo" com `createMode: "detail"`): um único
 * estado/autosave para o registro inteiro, não um por seção — senão o valor
 * de uma seção sem o campo `primary` nunca é salvo (cada `FormView` seria uma
 * instância React separada, ver Plano Base.md 2.6). Nenhum request até o
 * campo `primary` ter valor não vazio. No primeiro commit (blur/Enter) depois
 * disso que passar na validação, cria o registro e troca a URL pro Detail de
 * verdade — dali em diante é o `EditFormView` normal que assume (`?focus=`
 * foca o próximo campo, agora podendo atravessar seções).
 */
export function DraftProvider<T extends object>({
    model,
    fields,
    children,
}: {
    model: string;
    fields: FormFieldConfig<T>[];
    children: React.ReactNode;
}) {
    const primaryField = React.useMemo(() => fields.find((field) => field.primary), [fields]);
    const [values, setValues] = React.useState<Record<string, string>>(() =>
        Object.fromEntries(fields.map((field) => [field.name, ""])),
    );
    const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
    const { setStatus } = useAutoSaveStatus();
    const router = useRouter();
    const idRef = React.useRef<string | null>(null);
    const lastFocusedFieldRef = React.useRef<string | null>(null);

    const primaryFilled = Boolean(primaryField && values[primaryField.name]?.trim());

    // Reaproveita a fila/dedup do useAutoSaveController pra "mudanças que chegam enquanto o
    // create está em voo saem como PATCH assim que o id existir": o próprio hook serializa
    // os saves (um commit por vez, o resto fica em fila) — não precisa de guarda extra.
    const { saving, commitField } = useAutoSaveController<Record<string, string>>({
        draft: values,
        enabled: primaryFilled,
        onSave: async (draft) => {
            const validation = validateFormPayload(fields, draft);
            if (!validation.ok) {
                setFieldErrors(validation.fieldErrors);
                throw new Error("Corrija os campos destacados antes de salvar.");
            }

            setFieldErrors({});
            setStatus("saving");

            if (!idRef.current) {
                const result = await createRecordDraftAction(model, draft);
                if (!result.ok) {
                    if (result.fieldErrors) {
                        setFieldErrors((prev) => ({ ...prev, ...result.fieldErrors }));
                    }
                    throw new Error(result.message);
                }

                idRef.current = result.id;
                setStatus("saved");
                const nextField = nextFieldNameAfter(fields, lastFocusedFieldRef.current);
                router.replace(`/${model}/${result.id}${nextField ? `?focus=${nextField}` : ""}`);
                return values;
            }

            const result = await autoSaveRecord<Record<string, string>>(model, idRef.current, draft);
            if (!result.ok) {
                if (result.fieldErrors) {
                    setFieldErrors((prev) => ({ ...prev, ...result.fieldErrors }));
                }
                throw new Error(result.message);
            }
            setStatus("saved");
            return result.data;
        },
        onError: (err) => {
            console.error("[draft-autosave]", err);
            // D5 (docs/PLAN-fundacao-ux.md): mensagem específica quando o `onSave`
            // já lançou com ela (erro de campo ou validação local); genérico só
            // pra erro de verdade inesperado.
            setStatus("error", err instanceof Error ? err.message : "Falha ao salvar. Tentando novamente na próxima alteração.");
        },
    });

    const handleChange = React.useCallback((name: string, value: string) => {
        setValues((prev) => ({ ...prev, [name]: value }));
        setFieldErrors((prev) => {
            if (!(name in prev)) return prev;
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }, []);

    const handleBlur = React.useCallback(
        (name: string) => {
            // Captura no blur, não no focus: o Tab nativo já moveu o foco pro próximo
            // campo antes do save assíncrono terminar — se isso ficasse num onFocus,
            // o ref seria sobrescrito antes do onSave ler qual campo focar a seguir.
            lastFocusedFieldRef.current = name;
            commitField();
        },
        [commitField],
    );

    const contextValue = React.useMemo<DraftContextValue>(
        () => ({ values, fieldErrors, saving, onChange: handleChange, onBlur: handleBlur }),
        [values, fieldErrors, saving, handleChange, handleBlur],
    );

    return <DraftContext.Provider value={contextValue}>{children}</DraftContext.Provider>;
}

function useDraftContext(): DraftContextValue {
    const ctx = React.useContext(DraftContext);
    if (!ctx) {
        throw new Error("DraftSectionFields precisa estar dentro de um DraftProvider.");
    }
    return ctx;
}

/** Seção do rascunho: só renderiza o subconjunto de campos, lendo estado/autosave do DraftProvider. */
export function DraftSectionFields<T extends object>({ fields }: { fields: FormFieldConfig<T>[] }) {
    const { values, fieldErrors, saving, onChange, onBlur } = useDraftContext();

    return (
        <InlineFieldsGrid<T>
            fields={fields}
            values={values}
            fieldErrors={fieldErrors}
            saving={saving}
            onChange={onChange}
            onBlur={onBlur}
        />
    );
}
