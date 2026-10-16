"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/contexts/auth-context";
import { RoleEntity } from "@modules/roles/types/types";
import * as roleService from "@modules/roles/actions/roleService";
import RelationPicker from "@components/RelationPicker/RelationPicker";
import { toast } from "sonner";
import useApiError from "@/hooks/useApiError";
import { RelationHost, type RelationHostConfig } from "@core/registry/relation-host";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";

function UserRolesHost({ userId, initial }: { userId: string; initial: RoleEntity[] }) {
    const { currentTenantId } = useAuth();
    const formatError = useApiError();
    const { setStatus } = useAutoSaveStatus();

    const columns = React.useMemo<ColumnDef<RoleEntity>[]>(
        () => [
            { accessorKey: "name", header: "Nome" },
            { accessorKey: "type", header: "Tipo" },
            { accessorKey: "description", header: "Descrição", cell: ({ row }) => row.original.description ?? "—" },
        ],
        [],
    );

    const config = React.useMemo<RelationHostConfig<RoleEntity>>(
        () => ({
            title: "Roles",
            columns,
            initialData: initial,
            idAccessor: (r) => r.id,
            rowLink: (r) => `/roles/${r.id}`,
            emptyMessage: "Nenhuma role associada a este usuário.",
            confirmDetachTitle: "Remover role do usuário?",
            confirmDetachDescription: "O usuário perde imediatamente as permissões associadas a essa role.",
            onAttach: async (item: RoleEntity) => {
                if (!currentTenantId) {
                    toast("Tenant indisponível", { description: "Recarregue a página e tente novamente." });
                    return;
                }

                setStatus("saving");
                try {
                    await roleService.attachRoleUser({ roleId: item.id, tenantId: currentTenantId, userId });
                    setStatus("saved");
                    toast("Role associada");
                } catch (err) {
                    console.error("failed to attach role to user", err);
                    setStatus("error", "Falha ao associar a role.");
                    toast("Falha ao associar role", { description: formatError(err) });
                    throw err;
                }
            },
            onDetach: async (roleId: string) => {
                if (!currentTenantId) {
                    toast("Tenant indisponível", { description: "Recarregue a página e tente novamente." });
                    return;
                }

                setStatus("saving");
                try {
                    await roleService.detachRoleUser({ roleId, tenantId: currentTenantId, userId });
                    setStatus("saved");
                    toast("Role removida");
                } catch (err) {
                    console.error("failed to detach role from user", err);
                    setStatus("error", "Falha ao remover a role.");
                    toast("Falha ao remover role", { description: formatError(err) });
                    throw err;
                }
            },
            renderPicker: ({ onSelect, onClose }) => (
                <RelationPicker
                    kind="roles"
                    tenantId={currentTenantId}
                    // RelationPicker busca pela própria API e tipa o resultado
                    // como `Entity` (forma mínima genérica p/ renderizar a
                    // lista) — em runtime o endpoint de roles retorna o
                    // RoleEntity completo, só não declarado nesse tipo.
                    onSelect={(item) => onSelect(item as unknown as RoleEntity)}
                    onClose={onClose}
                />
            ),
        }),
        [columns, currentTenantId, formatError, initial, userId, setStatus],
    );

    return <RelationHost config={config} initial={initial} />;
}

export default UserRolesHost;
