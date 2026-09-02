"use client";

import * as React from "react";
import type { UserEntity } from "@/modules/users/types/types";

export function TenantUsersHost({ items }: { items: UserEntity[] }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Usuários</h3>
            </div>

            <div className="overflow-hidden rounded-md border">
                <table className="w-full table-auto text-sm">
                    <thead className="bg-muted/50 text-left">
                        <tr>
                            <th className="px-3 py-2">E-mail</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Criado em</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                                    Nenhum usuário associado.
                                </td>
                            </tr>
                        ) : (
                            items.map((user) => (
                                <tr key={user.id} className="border-t">
                                    <td className="px-3 py-2">{user.email}</td>
                                    <td className="px-3 py-2">{user.status}</td>
                                    <td className="px-3 py-2">{user.createdAt?.slice(0, 16).replace("T", ", ") ?? "—"}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default TenantUsersHost;
