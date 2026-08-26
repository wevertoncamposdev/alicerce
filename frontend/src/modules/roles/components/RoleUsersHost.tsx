"use client";
import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { UserEntity } from "@/modules/users/types/types";
import { UsersListView } from "@modules/users/components/UsersListView";
import { apiClient } from "@lib/api-client";
import * as roleService from "@/modules/roles/actions/roleService";
import RelationPicker from "@/components/RelationPicker/RelationPicker";
import { useToast } from "@components/ui/toast";
import useApiError from "@/hooks/useApiError";

export function RoleUsersHost({ roleId, initial }: { roleId: string; initial: UserEntity[] }) {
    const [items, setItems] = React.useState<UserEntity[]>(initial ?? []);
    const { currentTenantId } = useAuth();

    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [loadingIds, setLoadingIds] = React.useState<Record<string, boolean>>({});
    const toast = useToast();
    const formatError = useApiError();

    async function handleAttachSelect(item: any) {
        // optimistic add
        const prev = items;
        const newItem: UserEntity = item;
        setItems((s) => [newItem, ...s]);
        setLoadingIds((l) => ({ ...l, [item.id]: true }));
        try {
            await roleService.attachRoleUser({ roleId, tenantId: currentTenantId ?? "", userId: item.id });
            // success
            toast.show({ title: "Usuário associado" });
        } catch (err) {
            console.error("failed to attach user", err);
            setItems(prev);
            toast.show({ title: "Falha ao associar usuário", description: formatError(err) });
        } finally {
            setLoadingIds((l) => {
                const copy = { ...l };
                delete copy[item.id];
                return copy;
            });
        }
    }

    async function handleDetach(userId: string) {
        if (!confirm("Remover usuário deste role?")) return;
        const prev = items;
        setItems((s) => s.filter((u) => u.id !== userId));
        setLoadingIds((l) => ({ ...l, [userId]: true }));
        try {
            await roleService.detachRoleUser({ roleId, tenantId: currentTenantId ?? "", userId });
            toast.show({ title: "Usuário removido" });
        } catch (err) {
            console.error("failed to detach user", err);
            setItems(prev);
            toast.show({ title: "Falha ao remover usuário", description: formatError(err) });
        } finally {
            setLoadingIds((l) => {
                const copy = { ...l };
                delete copy[userId];
                return copy;
            });
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Usuários</h3>
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
                            <th>E-mail</th>
                            <th>Status</th>
                            <th>Criado em</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((u) => (
                            <tr key={u.id}>
                                <td>{u.email}</td>
                                <td>{u.status}</td>
                                <td>{u.createdAt?.slice?.(0, 16).replace("T", ", ")}</td>
                                <td>
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDetach(u.id)} disabled={!!loadingIds[u.id]}>
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
                    kind="users"
                    tenantId={currentTenantId}
                    onSelect={handleAttachSelect}
                    onClose={() => setPickerOpen(false)}
                />
            ) : null}
        </div>
    );
}

export default RoleUsersHost;
