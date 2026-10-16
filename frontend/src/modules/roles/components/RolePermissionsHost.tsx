"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/contexts/auth-context";
import type { PermissionEntity } from "@modules/permissions/types/types";
import * as roleService from "@modules/roles/actions/roleService";
import RelationPicker from "@components/RelationPicker/RelationPicker";
import { toast } from "sonner";
import useApiError from "@/hooks/useApiError";
import { RelationHost, type RelationHostConfig } from "@core/registry/relation-host";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";

function RolePermissionsHost({ roleId, initial }: { roleId: string; initial: PermissionEntity[] }) {
    const { currentTenantId } = useAuth();
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

    const config = React.useMemo<RelationHostConfig<PermissionEntity>>(
        () => ({
            title: "Permissões",
            columns,
            initialData: initial,
            idAccessor: (p) => p.id,
            rowLink: (p) => `/permissions/${p.id}`,
            emptyMessage: "Nenhuma permissão associada a esta role.",
            confirmDetachTitle: "Remover permissão desta role?",
            confirmDetachDescription: "Todos os usuários com essa role perdem essa permissão imediatamente.",
            onAttach: async (item: PermissionEntity) => {
                if (!currentTenantId) {
                    toast("Tenant indisponível", { description: "Recarregue a página e tente novamente." });
                    return;
                }

                setStatus("saving");
                try {
                    await roleService.attachRolePermission({ roleId, tenantId: currentTenantId, permissionId: item.id });
                    setStatus("saved");
                    toast("Permissão associada");
                } catch (err) {
                    console.error("failed to attach permission", err);
                    setStatus("error", "Falha ao associar a permissão.");
                    toast("Falha ao associar permissão", { description: formatError(err) });
                    throw err;
                }
            },
            onDetach: async (permissionId: string) => {
                if (!currentTenantId) {
                    toast("Tenant indisponível", { description: "Recarregue a página e tente novamente." });
                    return;
                }

                setStatus("saving");
                try {
                    await roleService.detachRolePermission({ roleId, tenantId: currentTenantId, permissionId });
                    setStatus("saved");
                    toast("Permissão removida");
                } catch (err) {
                    console.error("failed to detach permission", err);
                    setStatus("error", "Falha ao remover a permissão.");
                    toast("Falha ao remover permissão", { description: formatError(err) });
                    throw err;
                }
            },
            renderPicker: ({ onSelect, onClose }) => (
                <RelationPicker
                    kind="permissions"
                    tenantId={currentTenantId}
                    // RelationPicker busca pela própria API e tipa o resultado
                    // como `Entity` (forma mínima genérica p/ renderizar a
                    // lista) — em runtime o endpoint de permissions retorna o
                    // PermissionEntity completo, só não declarado nesse tipo.
                    onSelect={(item) => onSelect(item as unknown as PermissionEntity)}
                    onClose={onClose}
                />
            ),
        }),
        [columns, currentTenantId, formatError, initial, roleId, setStatus],
    );

    return <RelationHost config={config} initial={initial} />;
}

export default RolePermissionsHost;
