// lib/query-state/list-query-state.ts
import type { SearchArgs } from "@lib/data-provider/types";

const DEFAULT_PAGE_SIZE = 20;

export function createListQueryState(options?: { pageSize?: number }) {
    const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;

    function parseListState(searchParams: Record<string, string | string[] | undefined>): SearchArgs {
        const searchText = typeof searchParams.q === "string" ? searchParams.q : undefined;
        const pageParam = typeof searchParams.page === "string" ? Number(searchParams.page) : 1;
        const pageIndex = Number.isFinite(pageParam) && pageParam > 0 ? pageParam - 1 : 0;
        const sortField = typeof searchParams.sortField === "string" ? searchParams.sortField : undefined;
        const sortDirection =
            searchParams.sortDirection === "asc" || searchParams.sortDirection === "desc"
                ? searchParams.sortDirection
                : undefined;

        return {
            searchText,
            pagination: { pageIndex, pageSize },
            sort: sortField ? [{ field: sortField, direction: sortDirection ?? "asc" }] : undefined,
        };
    }

    function serializeListState(
        current: URLSearchParams,
        patch: Partial<{ searchText: string; pageIndex: number; sortField: string; sortDirection: "asc" | "desc" }>,
    ): URLSearchParams {
        const params = new URLSearchParams(current);

        if ("searchText" in patch) {
            if (patch.searchText) params.set("q", patch.searchText); else params.delete("q");
            params.delete("page");
        }
        if ("pageIndex" in patch && patch.pageIndex !== undefined) {
            if (patch.pageIndex > 0) params.set("page", String(patch.pageIndex + 1)); else params.delete("page");
        }
        if ("sortField" in patch) {
            if (patch.sortField) {
                params.set("sortField", patch.sortField);
                params.set("sortDirection", patch.sortDirection ?? "asc");
            } else {
                params.delete("sortField");
                params.delete("sortDirection");
            }
        }

        return params;
    }

    return { parseListState, serializeListState };
}