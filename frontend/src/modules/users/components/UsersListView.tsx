"use client";
import React from "react";
import type { UserEntity } from "../types/types";

export function UsersListView({ data }: { data: UserEntity[] }) {
    return (
        <div>
            <h2 className="text-lg font-medium mb-4">Usuários</h2>
            <table className="w-full table-auto">
                <thead>
                    <tr>
                        <th className="text-left">E-mail</th>
                        <th className="text-left">Status</th>
                        <th className="text-left">Criado em</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((u) => (
                        <tr key={u.id}>
                            <td>{u.email}</td>
                            <td>{u.status}</td>
                            <td>{u.createdAt?.slice?.(0, 16).replace("T", ", ")}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default UsersListView;
