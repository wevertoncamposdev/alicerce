"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { usePermissions } from "@/features/permissions/hooks/usePermissions";
import { PermissionEntity, PermissionType } from "@/features/permissions/permission.types";
import { useAuth } from "@/contexts/auth-context";
import { DetailShell, PainelSearchShell } from "@/components/Shells";
import { TypeView } from "@/components/TypeView";
import { ColumnDef } from "@tanstack/react-table";

export default function PermissionsPage() {
  const { permissions, loading, saving, error, createPermission, updatePermission, removePermission, reload } = usePermissions();
  const { hasPermission, currentTenantId } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<PermissionType>("READ");
  const [resource, setResource] = useState("");
  const [description, setDescription] = useState("");

  const canCreate = hasPermission("permission.create");
  const canUpdate = hasPermission("permission.update");
  const canDelete = hasPermission("permission.delete");
  const hasTenantContext = Boolean(currentTenantId);

  const permissionColumns: ColumnDef<PermissionEntity>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => <span>{row.original.name}</span>,
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => <span>{row.original.type}</span>,
    },
    {
      accessorKey: "resource",
      header: "Resource",
      cell: ({ row }) => <span>{row.original.resource ?? "-"}</span>,
    },
    {
      accessorKey: "description",
      header: "Descricao",
      cell: ({ row }) => <span>{row.original.description ?? "-"}</span>,
    },
    {
      id: "actions",
      header: "Acoes",
      cell: ({ row }) => {
        const permission = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!canUpdate || saving || !hasTenantContext}
              onClick={async () => {
                const nextName = window.prompt("Novo nome da permissao", permission.name);

                if (!nextName) {
                  return;
                }

                await updatePermission(permission.id, { name: nextName });
              }}
            >
              Editar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!canDelete || saving || !hasTenantContext}
              onClick={async () => {
                if (!window.confirm(`Remover a permissao ${permission.name}?`)) {
                  return;
                }

                await removePermission(permission.id);
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
    <DetailShell
      title="Permissoes"
      description="Gestao de permissoes no padrao arquitetural da Fase 2."
      error={error}
    >
      {!hasTenantContext ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Selecione um tenant no modulo de tenants para gerenciar permissoes.
        </div>
      ) : null}

      <PainelSearchShell
        title="Cadastro rapido"
        filters={
          <>
            <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
            <select
              className="border rounded px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as PermissionType)}
              disabled={saving}
            >
              <option value="READ">READ</option>
              <option value="WRITE">WRITE</option>
              <option value="DELETE">DELETE</option>
            </select>
            <Input placeholder="Resource" value={resource} onChange={(e) => setResource(e.target.value)} disabled={saving} />
            <Input placeholder="Descricao" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} />
          </>
        }
        actions={
          <>
            <Button
              disabled={!canCreate || saving || !hasTenantContext}
              onClick={async () => {
                await createPermission({ name, type, resource, description });
                setName("");
                setResource("");
                setDescription("");
              }}
            >
              Criar permissao
            </Button>
            <Button variant="outline" disabled={loading || saving} onClick={() => void reload()}>
              Atualizar
            </Button>
          </>
        }
      >
        <TypeView
          mode="table"
          data={permissions}
          columns={permissionColumns}
          isLoading={loading}
          loadingMessage="Carregando permissoes..."
          emptyMessage="Nenhuma permissao encontrada."
        />
      </PainelSearchShell>
    </DetailShell>
  );
}
