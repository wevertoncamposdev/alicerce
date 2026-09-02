"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { UserEntity } from "@/modules/users/types/types";
import * as roleService from "@/modules/roles/actions/roleService";
import RelationPicker from "@/components/RelationPicker/RelationPicker";
import { useToast } from "@components/ui/toast";
import useApiError from "@/hooks/useApiError";
import { createRelationHost } from "@/lib/registry/relation-host";
import type { ColumnDef } from "@tanstack/react-table";

export function RoleUsersHost({ roleId, initial }: { roleId: string; initial: UserEntity[] }) {
    const { currentTenantId } = useAuth();
    const toast = useToast();
    const formatError = useApiError();

    const columns = React.useMemo<ColumnDef<UserEntity>[]>(
        () => [
            { accessorKey: "email", header: "E-mail" },
            { accessorKey: "status", header: "Status" },
            { accessorKey: "createdAt", header: "Criado em", cell: ({ row }) => row.original.createdAt?.slice?.(0, 16).replace("T", ", ") },
        ],
        [],
    );

    const RelationHost = React.useMemo(
        () => createRelationHost<UserEntity>({
            title: "Usuários",
            columns,
            initialData: initial,
            idAccessor: (u) => u.id,
            onAttach: async (item: any) => {
                try {
                    await roleService.attachRoleUser({ roleId, tenantId: currentTenantId ?? "", userId: item.id });
                    toast.show({ title: "Usuário associado" });
                } catch (err) {
                    console.error("failed to attach user", err);
                    toast.show({ title: "Falha ao associar usuário", description: formatError(err) });
                    throw err;
                }
            },
            onDetach: async (userId: string) => {
                if (!confirm("Remover usuário deste role?")) return;
                try {
                    await roleService.detachRoleUser({ roleId, tenantId: currentTenantId ?? "", userId });
                    toast.show({ title: "Usuário removido" });
                } catch (err) {
                    console.error("failed to detach user", err);
                    toast.show({ title: "Falha ao remover usuário", description: formatError(err) });
                    throw err;
                }
            },
            renderPicker: ({ onSelect, onClose }) => (
                <RelationPicker
                    kind="users"
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

export default RoleUsersHost;
