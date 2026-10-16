"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { UserEntity } from "@modules/users/types/types";
import * as roleService from "@modules/roles/actions/roleService";
import RelationPicker from "@components/RelationPicker/RelationPicker";
import { toast } from "sonner";
import useApiError from "@/hooks/useApiError";
import { RelationHost, type RelationHostConfig } from "@core/registry/relation-host";
import type { ColumnDef } from "@tanstack/react-table";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";

function RoleUsersHost({ roleId, initial }: { roleId: string; initial: UserEntity[] }) {
    const { currentTenantId } = useAuth();
    const formatError = useApiError();
    const { setStatus } = useAutoSaveStatus();

    const columns = React.useMemo<ColumnDef<UserEntity>[]>(
        () => [
            { accessorKey: "email", header: "E-mail" },
            { accessorKey: "status", header: "Status" },
            { accessorKey: "createdAt", header: "Criado em", cell: ({ row }) => row.original.createdAt?.slice?.(0, 16).replace("T", ", ") },
        ],
        [],
    );

    const config = React.useMemo<RelationHostConfig<UserEntity>>(
        () => ({
            title: "Usuários",
            columns,
            initialData: initial,
            idAccessor: (u) => u.id,
            rowLink: (u) => `/users/${u.id}`,
            emptyMessage: "Nenhum usuário associado a esta role.",
            confirmDetachTitle: "Remover usuário desta role?",
            confirmDetachDescription: "O usuário perde imediatamente as permissões associadas a essa role.",
            onAttach: async (item: UserEntity) => {
                if (!currentTenantId) {
                    toast("Tenant indisponível", { description: "Recarregue a página e tente novamente." });
                    return;
                }

                setStatus("saving");
                try {
                    await roleService.attachRoleUser({ roleId, tenantId: currentTenantId, userId: item.id });
                    setStatus("saved");
                    toast("Usuário associado");
                } catch (err) {
                    console.error("failed to attach user", err);
                    setStatus("error", "Falha ao associar o usuário.");
                    toast("Falha ao associar usuário", { description: formatError(err) });
                    throw err;
                }
            },
            onDetach: async (userId: string) => {
                if (!currentTenantId) {
                    toast("Tenant indisponível", { description: "Recarregue a página e tente novamente." });
                    return;
                }

                setStatus("saving");
                try {
                    await roleService.detachRoleUser({ roleId, tenantId: currentTenantId, userId });
                    setStatus("saved");
                    toast("Usuário removido");
                } catch (err) {
                    console.error("failed to detach user", err);
                    setStatus("error", "Falha ao remover o usuário.");
                    toast("Falha ao remover usuário", { description: formatError(err) });
                    throw err;
                }
            },
            renderPicker: ({ onSelect, onClose }) => (
                <RelationPicker
                    kind="users"
                    tenantId={currentTenantId}
                    // RelationPicker busca pela própria API e tipa o resultado
                    // como `Entity` (forma mínima genérica p/ renderizar a
                    // lista) — em runtime o endpoint de users retorna o
                    // UserEntity completo, só não declarado nesse tipo.
                    onSelect={(item) => onSelect(item as unknown as UserEntity)}
                    onClose={onClose}
                />
            ),
        }),
        [columns, currentTenantId, formatError, initial, roleId, setStatus],
    );

    return <RelationHost config={config} initial={initial} />;
}

export default RoleUsersHost;
