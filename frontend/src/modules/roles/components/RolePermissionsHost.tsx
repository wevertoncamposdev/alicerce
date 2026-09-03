"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/contexts/auth-context";
import type { PermissionEntity } from "@/modules/permissions/types/types";
import * as roleService from "@/modules/roles/actions/roleService";
import RelationPicker from "@/components/RelationPicker/RelationPicker";
import { useToast } from "@components/ui/toast";
import useApiError from "@/hooks/useApiError";
import { createRelationHost } from "@/lib/registry/relation-host";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";

export function RolePermissionsHost({ roleId, initial }: { roleId: string; initial: PermissionEntity[] }) {
    const { currentTenantId } = useAuth();
    const toast = useToast();
    const formatError = useApiError();
    const { setStatus } = useAutoSaveStatus();

    const columns = React.useMemo<ColumnDef<PermissionEntity>[]>(
        () => [
            { accessorKey: "name", header: "Nome" },
            { accessorKey: "type", header: "Tipo" },
            { accessorKey: "resource", header: "Recurso", cell: ({ row }) => row.original.resource ?? "—" },
        ],
        [],
    );

    const RelationHost = React.useMemo(
        () => createRelationHost<PermissionEntity>({
            title: "Permissões",
            columns,
            initialData: initial,
            idAccessor: (p) => p.id,
            rowLink: (p) => `/permissions/${p.id}`,
            onAttach: async (item: any) => {
                if (!currentTenantId) {
                    toast.show({ title: "Tenant indisponível", description: "Recarregue a página e tente novamente." });
                    return;
                }

                setStatus("saving");
                try {
                    await roleService.attachRolePermission({ roleId, tenantId: currentTenantId, permissionId: item.id });
                    setStatus("saved");
                    toast.show({ title: "Permissão associada" });
                } catch (err) {
                    console.error("failed to attach permission", err);
                    setStatus("error", "Falha ao associar a permissão.");
                    toast.show({ title: "Falha ao associar permissão", description: formatError(err) });
                    throw err;
                }
            },
            onDetach: async (permissionId: string) => {
                if (!window.confirm("Remover permissão deste role?")) return;
                if (!currentTenantId) {
                    toast.show({ title: "Tenant indisponível", description: "Recarregue a página e tente novamente." });
                    return;
                }

                setStatus("saving");
                try {
                    await roleService.detachRolePermission({ roleId, tenantId: currentTenantId, permissionId });
                    setStatus("saved");
                    toast.show({ title: "Permissão removida" });
                } catch (err) {
                    console.error("failed to detach permission", err);
                    setStatus("error", "Falha ao remover a permissão.");
                    toast.show({ title: "Falha ao remover permissão", description: formatError(err) });
                    throw err;
                }
            },
            renderPicker: ({ onSelect, onClose }) => (
                <RelationPicker
                    kind="permissions"
                    tenantId={currentTenantId}
                    onSelect={onSelect}
                    onClose={onClose}
                />
            ),
        }),
        [columns, currentTenantId, formatError, initial, roleId, toast],
    );

    return <RelationHost initial={initial} />;
}

export default RolePermissionsHost;
