"use client";

import * as React from "react";
import { toast } from "sonner";
import { Checkbox } from "@components/ui/checkbox";
import { useAuth } from "@/contexts/auth-context";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";
import useApiError from "@/hooks/useApiError";
import { replaceRolePermissions, type PermissionMatrixGroup } from "@modules/roles/actions/roleService";

// Matriz recurso x ação (Plano Base.md 8.3 / endpoint da etapa 3.5): marcar
// um checkbox manda o CONJUNTO INTEIRO de permissões concedidas — não é um
// toggle individual, ver RolesService.replacePermissions.
export function RolePermissionMatrix({ roleId, initial }: { roleId: string; initial: PermissionMatrixGroup[] }) {
    const { hasPermission } = useAuth();
    const formatError = useApiError();
    const { setStatus } = useAutoSaveStatus();
    const canAssign = hasPermission("role.assign");

    const [groups, setGroups] = React.useState(initial);
    const [pendingId, setPendingId] = React.useState<string | null>(null);

    async function handleToggle(permissionId: string, nextChecked: boolean) {
        const previousGroups = groups;
        const nextGroups = groups.map((group) => ({
            ...group,
            permissions: group.permissions.map((permission) =>
                permission.id === permissionId ? { ...permission, granted: nextChecked } : permission,
            ),
        }));
        const allGrantedIds = nextGroups.flatMap((group) =>
            group.permissions.filter((permission) => permission.granted).map((permission) => permission.id),
        );

        setGroups(nextGroups);
        setPendingId(permissionId);
        setStatus("saving");
        try {
            const updated = await replaceRolePermissions(roleId, allGrantedIds);
            setGroups(updated);
            setStatus("saved");
        } catch (err) {
            setGroups(previousGroups);
            setStatus("error", "Falha ao atualizar permissões.");
            toast("Falha ao atualizar permissões", { description: formatError(err) });
        } finally {
            setPendingId(null);
        }
    }

    if (groups.length === 0) {
        return <p className="text-sm text-muted-foreground">Nenhuma permissão cadastrada.</p>;
    }

    return (
        <div className="space-y-6">
            {groups.map((group) => (
                <div key={group.resource} className="space-y-2">
                    <h4 className="text-sm font-semibold capitalize">{group.resource}</h4>
                    <div className="divide-y rounded-md border">
                        {group.permissions.map((permission) => (
                            <label
                                key={permission.id}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                            >
                                <Checkbox
                                    checked={permission.granted}
                                    disabled={!canAssign || pendingId === permission.id}
                                    onCheckedChange={(checked) => handleToggle(permission.id, checked === true)}
                                />
                                <span className="flex flex-1 flex-col">
                                    <span className="font-medium">{permission.name}</span>
                                    {permission.description ? (
                                        <span className="text-xs text-muted-foreground">{permission.description}</span>
                                    ) : null}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
