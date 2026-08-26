"use client";
import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { PermissionEntity } from "@/modules/permissions/types/types";
import { PermissionsListView } from "@modules/permissions/components/PermissionsListView";
import { apiClient } from "@lib/api-client";
import * as roleService from "@/modules/roles/actions/roleService";
import RelationPicker from "@/components/RelationPicker/RelationPicker";
import { useToast } from "@components/ui/toast";
import useApiError from "@/hooks/useApiError";

export function RolePermissionsHost({ roleId, initial }: { roleId: string; initial: PermissionEntity[] }) {
    const [items, setItems] = React.useState<PermissionEntity[]>(initial ?? []);
    const { currentTenantId } = useAuth();

    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [loadingIds, setLoadingIds] = React.useState<Record<string, boolean>>({});
    const toast = useToast();
    const formatError = useApiError();

    async function handleAttachSelect(item: any) {
        const prev = items;
        const newItem: PermissionEntity = item;
        setItems((s) => [newItem, ...s]);
        setLoadingIds((l) => ({ ...l, [item.id]: true }));
        try {
            await roleService.attachRolePermission({ roleId, tenantId: currentTenantId ?? "", permissionId: item.id });
            toast.show({ title: "Permissão associada" });
        } catch (err) {
            console.error("failed to attach permission", err);
            setItems(prev);
            toast.show({ title: "Falha ao associar permissão", description: formatError(err) });
        } finally {
            setLoadingIds((l) => {
                const copy = { ...l };
                delete copy[item.id];
                return copy;
            });
        }
    }

    async function handleDetach(permissionId: string) {
        if (!confirm("Remover permissão deste role?")) return;
        const prev = items;
        setItems((s) => s.filter((p) => p.id !== permissionId));
        setLoadingIds((l) => ({ ...l, [permissionId]: true }));
        try {
            await roleService.detachRolePermission({ roleId, tenantId: currentTenantId ?? "", permissionId });
            toast.show({ title: "Permissão removida" });
        } catch (err) {
            console.error("failed to detach permission", err);
            setItems(prev);
            toast.show({ title: "Falha ao remover permissão", description: formatError(err) });
        } finally {
            setLoadingIds((l) => {
                const copy = { ...l };
                delete copy[permissionId];
                return copy;
            });
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Permissões</h3>
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
                            <th>Recurso</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((p) => (
                            <tr key={p.id}>
                                <td>{p.name}</td>
                                <td>{p.type}</td>
                                <td>{p.resource ?? "—"}</td>
                                <td>
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDetach(p.id)} disabled={!!loadingIds[p.id]}>
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
                    kind="permissions"
                    tenantId={currentTenantId}
                    onSelect={handleAttachSelect}
                    onClose={() => setPickerOpen(false)}
                />
            ) : null}
        </div>
    );
}

export default RolePermissionsHost;
