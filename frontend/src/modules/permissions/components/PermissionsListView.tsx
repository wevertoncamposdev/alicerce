"use client";
import * as React from "react";
import Link from "next/link";
import { EmptyState } from "@components/ui/empty-state";
import type { PermissionEntity } from "../types/types";

// Somente leitura (Plano Base.md 8.4) — sem criar/editar/excluir, lista
// agrupada por recurso com descrição e em quais papéis cada permissão está.
export function PermissionsListView({ data }: { data: PermissionEntity[] }) {
    const groups = React.useMemo(() => {
        const byResource = new Map<string, PermissionEntity[]>();
        for (const permission of data) {
            const resource = permission.resource ?? "outros";
            if (!byResource.has(resource)) {
                byResource.set(resource, []);
            }
            byResource.get(resource)!.push(permission);
        }
        return [...byResource.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [data]);

    if (groups.length === 0) {
        return <EmptyState title="Nenhuma permissão encontrada." className="py-10" />;
    }

    return (
        <div className="space-y-6">
            {groups.map(([resource, permissions]) => (
                <div key={resource} className="space-y-2">
                    <h3 className="text-sm font-semibold capitalize">{resource}</h3>
                    <div className="overflow-hidden rounded-md border">
                        <table className="w-full table-auto text-sm">
                            <thead className="bg-muted/50 text-left">
                                <tr>
                                    <th className="px-3 py-2">Nome</th>
                                    <th className="px-3 py-2">Descrição</th>
                                    <th className="px-3 py-2">Papéis</th>
                                </tr>
                            </thead>
                            <tbody>
                                {permissions.map((permission) => (
                                    <tr key={permission.id} className="border-t">
                                        <td className="px-3 py-2 font-medium">
                                            <Link href={`/permissions/${permission.id}`} className="text-foreground hover:underline">
                                                {permission.name}
                                            </Link>
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
