import { List as ShadcnList } from "@/components/ui/list";
import React from "react";

interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyMessage?: string;
}

export default function List<T>({ items, renderItem, emptyMessage }: ListProps<T>) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="text-zinc-400 text-lg italic border border-dashed border-zinc-200 rounded-lg px-6 py-8 bg-zinc-50">
          {emptyMessage || "Nenhum item encontrado."}
        </div>
      </div>
    );
  }
  return <ShadcnList>{items.map(renderItem)}</ShadcnList>;
}
