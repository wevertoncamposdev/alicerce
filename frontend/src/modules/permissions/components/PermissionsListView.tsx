"use client";
import React from "react";
import { useIntl } from "react-intl";
import type { PermissionEntity } from "../types/types";

export function PermissionsListView({ data }: { data: PermissionEntity[] }) {
    const { formatMessage } = useIntl();

    return (
        <div>
            <h2 className="text-lg font-medium mb-4">{formatMessage({ id: "permission.title" })}</h2>
            <table className="w-full table-auto">
                <thead>
                    <tr>
                        <th className="text-left">{formatMessage({ id: "permission.name" })}</th>
                        <th className="text-left">{formatMessage({ id: "permission.type" })}</th>
                        <th className="text-left">{formatMessage({ id: "permission.resource" })}</th>
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
