"use client";
import { useState } from "react";
import UsersTable from "@/features/users/components/UsersTable";
import { Button } from "@/components/ui/index";
import UsersForm from "@/features/users/components/UsersForm";
import { useUsers } from "@/features/users/hooks/useUsers";
import { UserEntity } from "@/features/users/user.types";
import { useAuth } from "@/contexts/auth-context";
import { DetailShell, PainelSearchShell, SideShell } from "@/components/shells";

export default function UsersPage() {
  const { hasPermission, currentTenantId } = useAuth();
  const { users, loading, error, createUser, updateUser, deleteUser, reload } = useUsers(currentTenantId);
  const [editingUser, setEditingUser] = useState<UserEntity | null>(null);
  const [saving, setSaving] = useState(false);
  const hasTenantContext = Boolean(currentTenantId);

  const canCreate = hasPermission("user.create");
  const canUpdate = hasPermission("user.update");
  const canDelete = hasPermission("user.delete");

  return (
    <DetailShell
      title="Usuarios"
      description="Gestao de usuarios com composicao arquitetural da Fase 2."
      error={error}
      toolbar={<Button disabled={!canCreate || !hasTenantContext}>Novo usuario</Button>}
    >
      {!hasTenantContext ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Selecione um tenant no modulo de tenants para gerenciar usuarios.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <SideShell
            title={editingUser ? "Editar usuario" : "Criar usuario"}
            description="Formulario principal de cadastro/edicao."
          >
            <UsersForm
              key={editingUser?.id ?? "create"}
              mode={editingUser ? "edit" : "create"}
              initialUser={editingUser}
              saving={saving}
              onCancel={() => setEditingUser(null)}
              onSubmit={async (payload) => {
                setSaving(true);
                try {
                  if (editingUser) {
                    if (!canUpdate) {
                      throw new Error("Sem permissao para atualizar usuario.");
                    }

                    await updateUser(editingUser.id, payload);
                    setEditingUser(null);
                    return;
                  }

                  if (!canCreate) {
                    throw new Error("Sem permissao para criar usuario.");
                  }

                  if (!hasTenantContext) {
                    throw new Error("Selecione um tenant antes de criar usuario.");
                  }

                  if (!payload.password) {
                    throw new Error("Senha obrigatoria para criacao.");
                  }

                  await createUser({ email: payload.email, password: payload.password });
                } finally {
                  setSaving(false);
                }
              }}
            />
          </SideShell>
        </div>

        <div className="xl:col-span-2">
          <PainelSearchShell
            title="Listagem"
            actions={
              <Button variant="outline" disabled={loading || saving} onClick={() => void reload()}>
                Atualizar
              </Button>
            }
          >
            <UsersTable
              users={users}
              loading={loading}
              saving={saving}
              onEdit={(user) => {
                if (!canUpdate) {
                  return;
                }

                setEditingUser(user);
              }}
              onDelete={async (user) => {
                if (!canDelete) {
                  throw new Error("Sem permissao para remover usuario.");
                }

                setSaving(true);
                try {
                  await deleteUser(user.id);
                  if (editingUser?.id === user.id) {
                    setEditingUser(null);
                  }
                } finally {
                  setSaving(false);
                }
              }}
            />
          </PainelSearchShell>
        </div>
      </div>
    </DetailShell>
  );
}
