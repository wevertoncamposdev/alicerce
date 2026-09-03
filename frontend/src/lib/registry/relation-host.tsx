"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import RelationCrudHost from "@/components/DetailView/RelationView/RelationCrudHost";

export type RelationHostFactoryConfig<T extends Record<string, any>> = {
    title: string;
    columns: ColumnDef<T>[];
    initialData: T[];
    idAccessor?: (item: T) => string;
    rowLink?: (item: T) => string | undefined;
    attachLabel?: string;
    onAttach?: (item: any) => Promise<void> | void;
    onDetach?: (id: string) => Promise<void> | void;
    renderPicker?: (props: {
        onSelect: (item: any) => Promise<void> | void;
        onClose: () => void;
    }) => React.ReactNode;
};

export function createRelationHost<T extends Record<string, any>>(config: RelationHostFactoryConfig<T>) {
    return function RelationHostWrapper(props: { initial?: T[] }) {
        const [pickerOpen, setPickerOpen] = React.useState(false);
        const [items, setItems] = React.useState<T[]>(props.initial ?? config.initialData);
        const idAccessor = config.idAccessor ?? ((it) => String((it as any).id ?? ""));

        React.useEffect(() => {
            setItems(props.initial ?? config.initialData);
        }, [config.initialData, props.initial]);

        const handleSelect = async (item: any) => {
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
    };
}

export default createRelationHost;
