"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { useRoles } from "@/features/roles/hooks/useRoles";
import { RoleEntity, RoleType } from "@/features/roles/role.types";
import { useAuth } from "@/contexts/auth-context";
import { DetailShell, PainelSearchShell, RelationShell } from "@/components/shells";
import { TypeView } from "@/components/TypeView";
import { ColumnDef } from "@tanstack/react-table";

export default function RolesPage() {
  const { roles, loading, saving, error, createRole, updateRole, removeRole, assignUser, assignPermission, reload } = useRoles();
  const { hasPermission, currentTenantId } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<RoleType>("USER");
  const [description, setDescription] = useState("");
  const [assignmentRoleId, setAssignmentRoleId] = useState("");
  const [assignmentUserId, setAssignmentUserId] = useState("");
  const [assignmentPermissionId, setAssignmentPermissionId] = useState("");

  const canCreate = hasPermission("role.create");
  const canUpdate = hasPermission("role.update");
  const canDelete = hasPermission("role.delete");
  const canAssign = hasPermission("role.assign");
  const hasTenantContext = Boolean(currentTenantId);

  const roleColumns: ColumnDef<RoleEntity>[] = [
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
      accessorKey: "description",
      header: "Descricao",
      cell: ({ row }) => <span>{row.original.description ?? "-"}</span>,
    },
    {
      id: "actions",
      header: "Acoes",
      cell: ({ row }) => {
        const role = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canUpdate || saving || !hasTenantContext}
              onClick={async () => {
                const newName = window.prompt("Novo nome do papel", role.name);

                if (!newName) {
                  return;
                }

                await updateRole(role.id, { name: newName });
              }}
            >
              Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={!canDelete || saving || !hasTenantContext}
              onClick={async () => {
                if (!window.confirm(`Remover o papel ${role.name}?`)) {
                  return;
                }

                await removeRole(role.id);
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
      title="Papeis"
      description="Piloto da Fase 2 com TypeView e shells de relacao."
      error={error}
    >
      {!hasTenantContext ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Selecione um tenant no modulo de tenants para gerenciar papeis.
        </div>
      ) : null}

      <PainelSearchShell
        title="Cadastro rapido"
        actions={
          <>
            <Button
              disabled={saving || !canCreate || !hasTenantContext}
              onClick={async () => {
                await createRole({ name, type, description });
                setName("");
                setDescription("");
              }}
            >
              Criar papel
            </Button>
            <Button variant="outline" disabled={loading || saving} onClick={() => void reload()}>
              Atualizar
            </Button>
          </>
        }
        filters={
          <>
            <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
            <select
              className="border rounded px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as RoleType)}
              disabled={saving}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
              <option value="GUEST">GUEST</option>
            </select>
            <Input placeholder="Descricao" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} />
          </>
        }
      >
        <TypeView
          mode="table"
          data={roles}
          columns={roleColumns}
          isLoading={loading}
          loadingMessage="Carregando papeis..."
          emptyMessage="Nenhum papel encontrado."
        />
      </PainelSearchShell>

      <RelationShell
        title="Vinculos do papel"
        description="Associacao de usuarios e permissoes por ID no piloto inicial."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="Role ID" value={assignmentRoleId} onChange={(e) => setAssignmentRoleId(e.target.value)} disabled={saving} />
            <Input placeholder="User ID" value={assignmentUserId} onChange={(e) => setAssignmentUserId(e.target.value)} disabled={saving} />
            <Button
              disabled={!canAssign || saving || !hasTenantContext}
              onClick={async () => {
                await assignUser(assignmentRoleId, assignmentUserId);
                setAssignmentUserId("");
              }}
            >
              Vincular usuario
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="Role ID" value={assignmentRoleId} onChange={(e) => setAssignmentRoleId(e.target.value)} disabled={saving} />
            <Input placeholder="Permission ID" value={assignmentPermissionId} onChange={(e) => setAssignmentPermissionId(e.target.value)} disabled={saving} />
            <Button
              disabled={!canAssign || saving || !hasTenantContext}
              onClick={async () => {
                await assignPermission(assignmentRoleId, assignmentPermissionId);
                setAssignmentPermissionId("");
              }}
            >
              Vincular permissao
            </Button>
          </div>
        </div>
      </RelationShell>
    </DetailShell>
  );
}
