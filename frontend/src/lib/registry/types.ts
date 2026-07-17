import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { ContextItem, AuditFeedItem } from "@/components/DetailView/MetaDataView/types";
import type React from "react";

export type RecordModuleDataHandlers<T> = {
    search: (args: SearchArgs) => Promise<SearchResult<T>>;
    read: (id: string) => Promise<T>;
    create: (payload: unknown) => Promise<T>;
    update: (id: string, payload: unknown) => Promise<T>;
    delete: (id: string) => Promise<void>;
};

export type FormFieldConfig<T> = {
    name: keyof T & string;
    label: string;
    placeholder?: string;
    type: "text" | "url" | "textarea";
    required?: boolean;
};

/**
 * Contexto que o DetailShellEngine injeta em cada slot.
 * T = tipo da entidade do módulo (ex: FavoriteEntity)
 */
export type DetailContext<T> = {
    record: T;
    contextItems: ContextItem[];
    auditItems: AuditFeedItem[];
};

/**
 * Cada slot é uma função pura: (contexto) => JSX.
 * Se o módulo não define um slot, o engine simplesmente não renderiza aquela área.
 */
export type DetailLayout<T> = {
    main: (ctx: DetailContext<T>) => React.ReactNode;
    side?: (ctx: DetailContext<T>) => React.ReactNode;
    bottom?: (ctx: DetailContext<T>) => React.ReactNode;
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
    /** Novo na Fase 8: descreve como montar a tela de detalhe deste módulo */
    detailLayout?: DetailLayout<T>;
};
