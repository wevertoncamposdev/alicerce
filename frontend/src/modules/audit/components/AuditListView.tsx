"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AuditRow } from "@modules/audit/config/row-view-model";
import type { AuditUserOption } from "@modules/audit/config/provider";
import { EmptyState } from "@components/ui/empty-state";
import { Button } from "@components/ui/button";
import type { SearchResult } from "@core/data-provider/types";

const AUDIT_TYPE_OPTIONS = [
    { value: "LOGIN", label: "Login" },
    { value: "LOGOUT", label: "Logout" },
    { value: "LOGIN_FAILED", label: "Login falhou" },
    { value: "ACCESS_DENIED", label: "Acesso negado" },
    { value: "DATA_CHANGE", label: "Alteração de dado" },
    { value: "PERMISSION_CHANGE", label: "Alteração de permissão" },
];

type AuditListViewProps = {
    data: AuditRow[];
    pagination: SearchResult<AuditRow>["pagination"];
    users: AuditUserOption[];
};

// Filtros na URL (Plano Base.md 8.5): usuário, entidade, tipo, período —
// cada um vira um query param próprio, sem passar pela factory genérica de
// list-query-state.ts (não cobre filtros arbitrários).
export function AuditListView({ data, pagination, users }: AuditListViewProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const userId = searchParams.get("userId") ?? "";
    const entity = searchParams.get("entity") ?? "";
    const type = searchParams.get("type") ?? "";
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";
    const hasActiveFilters = Boolean(userId || entity || type || from || to);

    function patch(next: Record<string, string>) {
        const params = new URLSearchParams(searchParams);
        for (const [key, value] of Object.entries(next)) {
            if (value) params.set(key, value); else params.delete(key);
        }
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
    }

    function navigate(pageIndex: number) {
        const params = new URLSearchParams(searchParams);
        if (pageIndex > 0) params.set("page", String(pageIndex + 1)); else params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
    }

    const canPreviousPage = pagination.page > 1;
    const canNextPage = pagination.page < pagination.pages;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                    <label htmlFor="audit-filter-user" className="text-xs text-muted-foreground">Usuário</label>
                    <select
                        id="audit-filter-user"
                        value={userId}
                        onChange={(e) => patch({ userId: e.target.value })}
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                    >
                        <option value="">Todos</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>{user.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="audit-filter-entity" className="text-xs text-muted-foreground">Entidade</label>
                    <input
                        id="audit-filter-entity"
                        type="text"
                        placeholder="ex.: user, feedback"
                        defaultValue={entity}
                        onBlur={(e) => patch({ entity: e.target.value })}
                        className="h-9 w-40 rounded-md border bg-background px-2 text-sm"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="audit-filter-type" className="text-xs text-muted-foreground">Tipo</label>
                    <select
                        id="audit-filter-type"
                        value={type}
                        onChange={(e) => patch({ type: e.target.value })}
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                    >
                        <option value="">Todos</option>
                        {AUDIT_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="audit-filter-from" className="text-xs text-muted-foreground">De</label>
                    <input
                        id="audit-filter-from"
                        type="date"
                        defaultValue={from.slice(0, 10)}
                        onChange={(e) => patch({ from: e.target.value ? `${e.target.value}T00:00:00.000Z` : "" })}
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="audit-filter-to" className="text-xs text-muted-foreground">Até</label>
                    <input
                        id="audit-filter-to"
                        type="date"
                        defaultValue={to.slice(0, 10)}
                        onChange={(e) => patch({ to: e.target.value ? `${e.target.value}T23:59:59.999Z` : "" })}
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                    />
                </div>

                {hasActiveFilters ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => patch({ userId: "", entity: "", type: "", from: "", to: "" })}
                    >
                        Limpar filtros
                    </Button>
                ) : null}
            </div>

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
                                    <td className="px-3 py-2 font-medium">
                                        <Link href={`/audit/${entry.id}`} className="text-foreground hover:underline">
                                            {entry.actionText}
                                        </Link>
                                    </td>
                                    <td className="px-3 py-2">{entry.entityText}</td>
                                    <td className="px-3 py-2">
                                        {entry.recordHref ? (
                                            <Link href={entry.recordHref} className="hover:underline">
                                                {entry.recordShort}
                                            </Link>
                                        ) : "—"}
                                    </td>
                                    <td className="px-3 py-2">{entry.userText}</td>
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
