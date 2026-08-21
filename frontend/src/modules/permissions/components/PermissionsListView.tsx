"use client";
import React from "react";
import type { PermissionEntity } from "../types/types";

export function PermissionsListView({ data }: { data: PermissionEntity[] }) {
    return (
        <div>
            <h2 className="text-lg font-medium mb-4">Permissions</h2>
            <table className="w-full table-auto">
                <thead>
                    <tr>
                        <th className="text-left">Nome</th>
                        <th className="text-left">Tipo</th>
                        <th className="text-left">Recurso</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((p) => (
                        <tr key={p.id}>
                            <td>{p.name}</td>
                            <td>{p.type}</td>
                            <td>{p.resource ?? "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default PermissionsListView;
