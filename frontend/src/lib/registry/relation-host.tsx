"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import RelationCrudHost from "@/components/DetailView/RelationView/RelationCrudHost";

export type RelationHostFactoryConfig<T extends Record<string, any>> = {
    title: string;
    columns: ColumnDef<T>[];
    initialData: T[];
    idAccessor?: (item: T) => string;
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
        const mergedInitial = props.initial ?? config.initialData;

        const handleSelect = async (item: any) => {
            if (config.onAttach) {
                await config.onAttach(item);
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
                    initialData={mergedInitial}
                    detach={config.onDetach ? async (id: string) => { await config.onDetach?.(id); } : undefined}
                    idAccessor={config.idAccessor ?? ((it) => String((it as any).id ?? ""))}
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
