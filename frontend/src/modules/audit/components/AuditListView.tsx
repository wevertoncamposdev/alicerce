"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AuditEntry } from "@modules/audit/types/types";
import { EmptyState } from "@components/ui/empty-state";
import { Button } from "@components/ui/button";
import type { SearchResult } from "@core/data-provider/types";
import { createListQueryState } from "@lib/query-state/list-query-state";

const { serializeListState } = createListQueryState();

type AuditListViewProps = {
    data: AuditEntry[];
    pagination: SearchResult<AuditEntry>["pagination"];
};

export function AuditListView({ data, pagination }: AuditListViewProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function navigate(pageIndex: number) {
        const params = serializeListState(searchParams, { pageIndex });
        router.push(`${pathname}?${params.toString()}`);
    }

    const canPreviousPage = pagination.page > 1;
    const canNextPage = pagination.page < pagination.pages;

    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                        <tr>
                            <th className="px-3 py-2">Ação</th>
                            <th className="px-3 py-2">Entidade</th>
                            <th className="px-3 py-2">Registro</th>
                            <th className="px-3 py-2">Usuário</th>
                            <th className="px-3 py-2">Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={5}>
                                    <EmptyState title="Nenhum registro encontrado." className="py-6" />
                                </td>
                            </tr>
                        ) : (
                            data.map((entry) => (
                                <tr key={entry.id} className="border-t">
                                    <td className="px-3 py-2">{entry.action}</td>
                                    <td className="px-3 py-2">{entry.entity}</td>
                                    <td className="px-3 py-2">{entry.entityId ?? "—"}</td>
                                    <td className="px-3 py-2">{entry.user?.email ?? entry.userId}</td>
                                    <td className="px-3 py-2">{entry.createdAt?.slice(0, 16).replace("T", ", ") ?? "—"}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {data.length > 0 ? (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Página {pagination.page} de {pagination.pages} ({pagination.total} registro(s))
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(pagination.page - 2)}
                            disabled={!canPreviousPage}
                        >
                            <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(pagination.page)}
                            disabled={!canNextPage}
                        >
                            <ChevronRight className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
