import type { SearchArgs, SearchResult } from "@lib/data-provider/types";

export type RecordModuleDataHandlers<T> = {
    search: (args: SearchArgs) => Promise<SearchResult<T>>;
    read: (id: string) => Promise<T>;
    create: (payload: unknown) => Promise<T>;
    update: (id: string, payload: unknown) => Promise<T>;
    delete: (id: string) => Promise<void>;
};

export type RecordModuleDefinition<T = unknown> = {
    model: string;
    label: string;
    views: string[];
    defaultView: string;
    dataHandlers: RecordModuleDataHandlers<T>;
    parseListState: (searchParams: Record<string, string | string[] | undefined>) => SearchArgs;
    serializeListState: (current: URLSearchParams, patch: Record<string, unknown>) => URLSearchParams;
};