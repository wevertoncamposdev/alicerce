"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import RelationCrudHost from "@core/components/DetailView/RelationView/RelationCrudHost";
import type { AppTableFeatures } from "@core/table-features";

export type RelationHostConfig<T extends object> = {
    title: string;
    columns: ColumnDef<AppTableFeatures, T>[];
    initialData: T[];
    idAccessor?: (item: T) => string;
    rowLink?: (item: T) => string | undefined;
    attachLabel?: string;
    emptyMessage?: string;
    confirmDetachTitle?: string;
    confirmDetachDescription?: string;
    onAttach?: (item: T) => Promise<void> | void;
    onDetach?: (id: string) => Promise<void> | void;
    renderPicker?: (props: {
        onSelect: (item: T) => Promise<void> | void;
        onClose: () => void;
    }) => React.ReactNode;
};

/**
 * Componente fixo — a config varia (props), o componente não. Antes,
 * `createRelationHost(config)` criava um componente NOVO a cada chamada,
 * normalmente dentro de um `useMemo` no componente chamador; quando as
 * dependências desse `useMemo` mudavam (ex.: `currentTenantId` após um
 * re-render do AuthProvider), a identidade do componente mudava também — o
 * React desmontava a instância antiga e montava outra, resetando `items`/
 * `pickerOpen` sem motivo (bug real, não só lint: ver PLAN.md, Etapa 1).
 * Resolvido tornando o componente único e recebendo a config variável só
 * como prop — o React reconcilia props no mesmo componente montado.
 */
export function RelationHost<T extends object>({
    config,
    initial,
}: {
    config: RelationHostConfig<T>;
    initial?: T[];
}) {
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const sourceData = initial ?? config.initialData;
    const [items, setItems] = React.useState<T[]>(sourceData);
    // `items` começa em sourceData mas diverge dele conforme o usuário anexa/
    // remove (handleSelect/detach) — não é um simples espelho de prop, então
    // não dá para "derivar" direto. Re-sincronizar quando sourceData mudar de
    // verdade (ex.: o Server Component pai recarregou com dados novos) sem
    // useEffect: setState durante o render é seguro aqui porque o React
    // re-renderiza antes de pintar — ver "Adjusting state based on a prop
    // change" na documentação do React.
    const [prevSourceData, setPrevSourceData] = React.useState(sourceData);
    if (sourceData !== prevSourceData) {
        setPrevSourceData(sourceData);
        setItems(sourceData);
    }
    const idAccessor =
        config.idAccessor ?? ((it: T) => String((it as { id?: unknown }).id ?? ""));

    const handleSelect = async (item: T) => {
        const itemId = idAccessor(item);
        const previousItems = items;

        try {
            if (config.onAttach) {
                await config.onAttach(item);
            }

            setItems((current) => {
                if (!itemId || current.some((entry) => idAccessor(entry) === itemId)) {
                    return current;
                }
                return [...current, item];
            });
        } catch (err) {
            console.error("[relation-host] attach failed", err);
            setItems(previousItems);
            throw err;
        }

        setPickerOpen(false);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">{config.title}</h3>
                {config.onAttach ? (
                    <button type="button" className="btn" onClick={() => setPickerOpen(true)}>
                        {config.attachLabel ?? "Associar"}
                    </button>
                ) : null}
            </div>

            <RelationCrudHost<T>
                columns={config.columns}
                initialData={items}
                detach={config.onDetach ? async (id: string) => { await config.onDetach?.(id); } : undefined}
                idAccessor={idAccessor}
                rowLink={config.rowLink}
                emptyMessage={config.emptyMessage}
                confirmDetachTitle={config.confirmDetachTitle}
                confirmDetachDescription={config.confirmDetachDescription}
            />

            {pickerOpen && config.renderPicker ? (
                <>
                    {config.renderPicker({
                        onSelect: handleSelect,
                        onClose: () => setPickerOpen(false),
                    })}
                </>
            ) : null}
        </div>
    );
}
