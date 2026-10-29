"use client";
import * as React from "react";
import Link from "next/link";
import { EmptyState } from "@components/ui/empty-state";
import type { PermissionEntity } from "../types/types";

type PermissionRow = PermissionEntity & { resourceLabel: string; actionText: string };

// Somente leitura (Plano Base.md 8.4) — sem criar/editar/excluir, lista
// agrupada por recurso com descrição e em quais papéis cada permissão está.
export function PermissionsListView({ data }: { data: PermissionRow[] }) {
    const groups = React.useMemo(() => {
        const byResource = new Map<string, PermissionRow[]>();
        for (const permission of data) {
            if (!byResource.has(permission.resourceLabel)) {
                byResource.set(permission.resourceLabel, []);
            }
            byResource.get(permission.resourceLabel)!.push(permission);
        }
        return [...byResource.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [data]);

    if (groups.length === 0) {
        return <EmptyState title="Nenhuma permissão encontrada." className="py-10" />;
    }

    return (
        <div className="space-y-6">
            {groups.map(([resourceLabel, permissions]) => (
                <div key={resourceLabel} className="space-y-2">
                    <h3 className="text-sm font-semibold">{resourceLabel}</h3>
                    <div className="overflow-hidden rounded-md border">
                        <table className="w-full table-auto text-sm">
                            <thead className="bg-muted/50 text-left">
                                <tr>
                                    <th className="px-3 py-2">Ação</th>
                                    <th className="px-3 py-2">Descrição</th>
                                    <th className="px-3 py-2">Papéis</th>
                                </tr>
                            </thead>
                            <tbody>
                                {permissions.map((permission) => (
                                    <tr key={permission.id} className="border-t">
                                        <td className="px-3 py-2">
                                            <Link href={`/permissions/${permission.id}`} className="font-medium text-foreground hover:underline">
                                                {permission.actionText}
                                            </Link>
                                            <div className="text-xs text-muted-foreground">{permission.name}</div>
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground">{permission.description ?? "—"}</td>
                                        <td className="px-3 py-2 text-muted-foreground">
                                            {permission.roles && permission.roles.length > 0
                                                ? permission.roles.map((role) => role.name).join(", ")
                                                : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}
