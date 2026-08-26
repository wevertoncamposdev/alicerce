"use client";
import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { PermissionEntity } from "@/modules/permissions/types/types";
import { RoleEntity } from "@/modules/roles/types/types";
import * as roleService from "@/modules/roles/actions/roleService";
import RelationPicker from "@/components/RelationPicker/RelationPicker";
import { useToast } from "@components/ui/toast";
import useApiError from "@/hooks/useApiError";

export function PermissionRolesHost({ items }: { items: RoleEntity[] }) {
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Usado pelos roles</h3>
            <table className="w-full table-auto">
                <thead><tr><th>Nome</th><th>Tipo</th></tr></thead>
                <tbody>
                    {items.map((r) => (
                        <tr key={r.id}><td>{r.name}</td><td>{r.type ?? "—"}</td></tr>
                    ))}
                </tbody>
            </table>
            {items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum role usa esta permissão ainda.</p> : null}
        </div>
    );
}
export default PermissionRolesHost;
