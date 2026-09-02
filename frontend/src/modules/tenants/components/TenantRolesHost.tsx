"use client";

import * as React from "react";
import type { RoleEntity } from "@/modules/roles/types/types";

export function TenantRolesHost({ items }: { items: RoleEntity[] }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Roles</h3>
            </div>

            <div className="overflow-hidden rounded-md border">
                <table className="w-full table-auto text-sm">
                    <thead className="bg-muted/50 text-left">
                        <tr>
                            <th className="px-3 py-2">Nome</th>
                            <th className="px-3 py-2">Tipo</th>
                            <th className="px-3 py-2">Descrição</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                                    Nenhuma role associada.
                                </td>
                            </tr>
                        ) : (
                            items.map((role) => (
                                <tr key={role.id} className="border-t">
                                    <td className="px-3 py-2">{role.name}</td>
                                    <td className="px-3 py-2">{role.type}</td>
                                    <td className="px-3 py-2">{role.description ?? "—"}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default TenantRolesHost;
