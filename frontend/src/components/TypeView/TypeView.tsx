// components/TypeView/TypeView.tsx
import type { ListLayout, ListContext } from "@lib/registry/types";

export type TypeViewMode = string;

export function TypeView<T>({
    layout,
    mode,
    context,
}: {
    layout: ListLayout<T>;
    mode: TypeViewMode;
    context: ListContext<T>;
}) {
    const render = layout[mode];

    if (!render) {
        throw new Error(
            `View "${mode}" não está definida no listLayout deste módulo. ` +
            `Views disponíveis: ${Object.keys(layout).join(", ")}`
        );
    }

    return <>{render(context)}</>;
}