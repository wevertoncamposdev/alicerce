"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/contexts/auth-context";
import { RoleEntity } from "@/modules/roles/types/types";
import * as roleService from "@/modules/roles/actions/roleService";
import RelationPicker from "@/components/RelationPicker/RelationPicker";
import { useToast } from "@components/ui/toast";
import useApiError from "@/hooks/useApiError";
import { createRelationHost } from "@/lib/registry/relation-host";

export function UserRolesHost({ userId, initial }: { userId: string; initial: RoleEntity[] }) {
    const { currentTenantId } = useAuth();
    const toast = useToast();
    const formatError = useApiError();

    const columns = React.useMemo<ColumnDef<RoleEntity>[]>(
        () => [
            { accessorKey: "name", header: "Nome" },
            { accessorKey: "type", header: "Tipo" },
            { accessorKey: "description", header: "Descrição", cell: ({ row }) => row.original.description ?? "—" },
        ],
        [],
    );

    const RelationHost = React.useMemo(
        () => createRelationHost<RoleEntity>({
            title: "Roles",
            columns,
            initialData: initial,
            idAccessor: (r) => r.id,
            onAttach: async (item: any) => {
                try {
                    await roleService.attachRoleUser({ roleId: item.id, tenantId: currentTenantId ?? "", userId });
                    toast.show({ title: "Role associada" });
                } catch (err) {
                    console.error("failed to attach role to user", err);
                    toast.show({ title: "Falha ao associar role", description: formatError(err) });
                    throw err;
                }
            },
            onDetach: async (roleId: string) => {
                if (!confirm("Remover role do usuário?")) return;
                try {
                    await roleService.detachRoleUser({ roleId, tenantId: currentTenantId ?? "", userId });
                    toast.show({ title: "Role removida" });
                } catch (err) {
                    console.error("failed to detach role from user", err);
                    toast.show({ title: "Falha ao remover role", description: formatError(err) });
                    throw err;
                }
            },
            renderPicker: ({ onSelect, onClose }) => (
                <RelationPicker
                    kind="roles"
                    tenantId={currentTenantId}
                    onSelect={onSelect}
                    onClose={onClose}
                />
            ),
        }),
        [columns, currentTenantId, formatError, initial, toast, userId],
    );

    return <RelationHost initial={initial} />;
}

export default UserRolesHost;
