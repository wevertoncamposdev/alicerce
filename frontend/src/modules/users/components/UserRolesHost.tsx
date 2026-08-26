"use client";
import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { RoleEntity } from "@/modules/roles/types/types";
import { RolesListView } from "@modules/roles/components/RoleListView";
import { apiClient } from "@lib/api-client";
import * as roleService from "@/modules/roles/actions/roleService";
import RelationPicker from "@/components/RelationPicker/RelationPicker";
import { useToast } from "@components/ui/toast";
import useApiError from "@/hooks/useApiError";

export function UserRolesHost({ userId, initial }: { userId: string; initial: RoleEntity[] }) {
    const [items, setItems] = React.useState<RoleEntity[]>(initial ?? []);
    const { currentTenantId } = useAuth();

    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [loadingIds, setLoadingIds] = React.useState<Record<string, boolean>>({});
    const toast = useToast();
    const formatError = useApiError();

    async function handleAttachSelect(item: any) {
        const prev = items;
        const newItem: RoleEntity = item;
        setItems((s) => [newItem, ...s]);
        setLoadingIds((l) => ({ ...l, [item.id]: true }));
        try {
            await roleService.attachRoleUser({ roleId: item.id, tenantId: currentTenantId ?? "", userId });
            toast.show({ title: "Role associado" });
        } catch (err) {
            console.error("failed to attach role to user", err);
            setItems(prev);
            toast.show({ title: "Falha ao associar role", description: formatError(err) });
        } finally {
            setLoadingIds((l) => {
                const copy = { ...l };
                delete copy[item.id];
                return copy;
            });
        }
    }

    async function handleDetach(roleId: string) {
        if (!confirm("Remover role do usuário?")) return;
        const prev = items;
        setItems((s) => s.filter((r) => r.id !== roleId));
        setLoadingIds((l) => ({ ...l, [roleId]: true }));
        try {
            await roleService.detachRoleUser({ roleId, tenantId: currentTenantId ?? "", userId });
            toast.show({ title: "Role removido" });
        } catch (err) {
            console.error("failed to detach role from user", err);
            setItems(prev);
            toast.show({ title: "Falha ao remover role", description: formatError(err) });
        } finally {
            setLoadingIds((l) => {
                const copy = { ...l };
                delete copy[roleId];
                return copy;
            });
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Roles</h3>
                <div>
                    <button type="button" className="btn" onClick={() => setPickerOpen(true)}>
                        Associar
                    </button>
                </div>
            </div>
            <div>
                <table className="w-full table-auto">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Tipo</th>
                            <th>Descrição</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((r) => (
                            <tr key={r.id}>
                                <td>{r.name}</td>
                                <td>{r.type}</td>
                                <td>{r.description ?? "—"}</td>
                                <td>
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDetach(r.id)} disabled={!!loadingIds[r.id]}>
                                        Remover
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {pickerOpen ? (
                <RelationPicker
                    kind="roles"
                    tenantId={currentTenantId}
                    onSelect={handleAttachSelect}
                    onClose={() => setPickerOpen(false)}
                />
            ) : null}
        </div>
    );
}

export default UserRolesHost;
