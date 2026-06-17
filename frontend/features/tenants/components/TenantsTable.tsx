"use client";

import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/index";
import { ColumnDef } from "@tanstack/react-table";
import { Tenant } from "../tenant.types";

interface TenantsTableProps {
    tenants: Tenant[];
    loading?: boolean;
    saving?: boolean;
    onEdit: (tenant: Tenant) => void;
    onDelete: (tenant: Tenant) => Promise<void>;
}

function formatDate(dateIso: string) {
    return new Date(dateIso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export default function TenantsTable({
    tenants,
    loading = false,
    saving = false,
    onEdit,
    onDelete,
}: TenantsTableProps) {
    const columns: ColumnDef<Tenant>[] = [
        {
            accessorKey: "name",
            header: "Nome",
            cell: ({ row }) => <span>{row.original.name}</span>,
        },
        {
            accessorKey: "slug",
            header: "Slug",
            cell: ({ row }) => <span className="font-mono text-xs">/{row.original.slug}</span>,
        },
        {
            accessorKey: "description",
            header: "Descricao",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.description || "Sem descricao"}
                </span>
            ),
        },
        {
            accessorKey: "updatedAt",
            header: "Atualizado em",
            cell: ({ row }) => <span>{formatDate(row.original.updatedAt)}</span>,
        },
        {
            id: "actions",
            header: "Acoes",
            cell: ({ row }) => {
                const tenant = row.original;

                return (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={saving}
                            onClick={() => onEdit(tenant)}
                        >
                            Editar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={saving}
                            onClick={async () => {
                                const confirmDelete = window.confirm(
                                    `Deseja remover o tenant ${tenant.name}?`,
                                );

                                if (!confirmDelete) {
                                    return;
                                }

                                await onDelete(tenant);
                            }}
                        >
                            Excluir
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <DataTable
            columns={columns}
            data={tenants}
            isLoading={loading}
            loadingMessage="Carregando tenants..."
            emptyMessage="Nenhum tenant encontrado."
        />
    );
}
