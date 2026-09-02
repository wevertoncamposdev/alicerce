"use client";

import * as React from "react";
import type { PermissionEntity } from "@/modules/permissions/types/types";

export function UserPermissionsHost({ items }: { items: PermissionEntity[] }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Permissions</h3>
            </div>

            <div className="overflow-hidden rounded-md border">
                <table className="w-full table-auto text-sm">
                    <thead className="bg-muted/50 text-left">
                        <tr>
                            <th className="px-3 py-2">Nome</th>
                            <th className="px-3 py-2">Tipo</th>
                            <th className="px-3 py-2">Recurso</th>
                            <th className="px-3 py-2">Descrição</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                                    Nenhuma permission associada.
                                </td>
                            </tr>
                        ) : (
                            items.map((permission) => (
                                <tr key={permission.id} className="border-t">
                                    <td className="px-3 py-2">{permission.name}</td>
                                    <td className="px-3 py-2">{permission.type ?? "—"}</td>
                                    <td className="px-3 py-2">{permission.resource ?? "—"}</td>
                                    <td className="px-3 py-2">{permission.description ?? "—"}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default UserPermissionsHost;
