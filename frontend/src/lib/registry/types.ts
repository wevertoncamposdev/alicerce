// lib/registry/types.ts
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { ContextItem, AuditFeedItem } from "@/components/DetailView/MetaDataView/types";
import type React from "react";

export type RecordModuleDataHandlers<T> = {
    search: (args: SearchArgs) => Promise<SearchResult<T>>;
    read: (id: string) => Promise<T>;
    create?: (payload: unknown) => Promise<T>;   // opcional: módulos read-only (ex: audit) não implementam
    update?: (id: string, payload: unknown) => Promise<T>;
    delete?: (id: string) => Promise<void>;
};

export type FormFieldConfig<T> = {
    name: keyof T & string;
    label: string;
    placeholder?: string;
    type: "text" | "email" | "password" | "url" | "number" | "textarea" | "select";
    required?: boolean;
    options?: Array<string | { label: string; value: string }>;
};

export type DetailContext<T> = {
    record: T;
    contextItems: ContextItem[];
    auditItems: AuditFeedItem[];
};

export type RelationTabConfig = {
    key: string;
    label: string;
    content: React.ReactNode;
};

export type DetailLayout<T> = {
    main: (ctx: DetailContext<T>) => React.ReactNode;
    side?: (ctx: DetailContext<T>) => React.ReactNode;
    bottom?: (ctx: DetailContext<T>) => React.ReactNode;
    relations?: (ctx: DetailContext<T>) => RelationTabConfig[];
};

// ============================================================
// NOVO — simétrico ao DetailLayout, mas para a tela de listagem
// ============================================================

export type ListContext<T> = {
    data: T[];
    searchArgs: SearchArgs;
};

/**
 * Cada chave é uma "view" (list, cards, graph, ...) e o valor é uma função
 * pura (ctx) => JSX. O módulo só declara as views que efetivamente suporta;
 * TypeViewScreen usa `views` (a lista de chaves) pra saber quais existem.
 */
export type ListLayout<T> = Partial<Record<string, (ctx: ListContext<T>) => React.ReactNode>>;

// ============================================================
// NOVO — o que hoje é montado na mão em favorites/[id]/page.tsx
// ============================================================

export type DetailConfig<T> = {
    /** Se true, DetailViewScreen busca a trilha de auditoria automaticamente. */
    auditEnabled?: boolean;
    /**
     * Constrói os ContextItem[] a partir do record já carregado.
     * Isso é conhecimento de domínio do módulo — não pertence à page.
     */
    loadContext?: (record: T) => ContextItem[] | Promise<ContextItem[]>;
};

export type RecordModuleDefinition<T = unknown> = {
    model: string;
    label: string;
    views: string[];
    defaultView: string;
    dataHandlers: RecordModuleDataHandlers<T>;
    formFields: FormFieldConfig<T>[];
    parseListState: (searchParams: Record<string, string | string[] | undefined>) => SearchArgs;
    serializeListState: (current: URLSearchParams, patch: Record<string, unknown>) => URLSearchParams;

    /** Slots da tela de listagem — plugado no TypeViewScreen. */
    listLayout: ListLayout<T>;

    /** Slots da tela de detalhe — plugado no DetailViewScreen. */
    detailLayout?: DetailLayout<T>;

    /** Comportamento de borda da tela de detalhe (audit, context). */
    detailConfig?: DetailConfig<T>;
};