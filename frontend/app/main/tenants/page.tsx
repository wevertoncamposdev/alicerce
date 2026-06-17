
"use client";

import { useMemo, useState } from "react";
import TenantsForm from "@/features/tenants/components/TenantsForm";
import TenantsTable from "@/features/tenants/components/TenantsTable";
import { useTenants } from "@/features/tenants/hooks/useTenants";
import { TENANT_INITIAL_FORM_VALUES } from "@/features/tenants/tenant.constants";
import { Tenant, TenantFormValues, TenantPayload } from "@/features/tenants/tenant.types";
import { useAuth } from "@/contexts/auth-context";
import { DetailShell, PainelSearchShell, SideShell } from "@/components/shells";
import { Button } from "@/components/ui";

export default function TenantsPage() {
  const { currentTenantId, setCurrentTenantId } = useAuth();
  const { tenants, loading, saving, error, createTenant, updateTenant, removeTenant, reload } =
    useTenants();
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const formValues = useMemo<TenantFormValues>(() => {
    if (!editingTenant) {
      return TENANT_INITIAL_FORM_VALUES;
    }

    return {
      name: editingTenant.name,
      slug: editingTenant.slug,
      description: editingTenant.description,
    };
  }, [editingTenant]);

  async function handleSubmit(payload: TenantPayload) {
    if (editingTenant) {
      await updateTenant(editingTenant.id, payload);
      setEditingTenant(null);
      return;
    }

    await createTenant(payload);
  }

  async function handleDelete(tenant: Tenant) {
    await removeTenant(tenant.id);

    if (editingTenant?.id === tenant.id) {
      setEditingTenant(null);
    }
  }

  return (
    <DetailShell
      title="Tenants"
      description="Gestao de tenants com composicao arquitetural da Fase 2."
      error={error}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <SideShell
            title={editingTenant ? "Editar tenant" : "Criar tenant"}
            description="Formulario principal de cadastro e edicao."
          >
            <TenantsForm
              key={editingTenant?.id ?? "create"}
              mode={editingTenant ? "edit" : "create"}
              initialValues={formValues}
              saving={saving}
              onCancel={() => setEditingTenant(null)}
              onSubmit={handleSubmit}
            />
          </SideShell>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <PainelSearchShell
            title="Contexto e listagem"
            filters={
              <div className="flex items-center gap-2">
                <label htmlFor="tenant-context" className="text-sm text-zinc-600">
                  Contexto do tenant
                </label>
                <select
                  id="tenant-context"
                  value={currentTenantId ?? ""}
                  onChange={(event) =>
                    setCurrentTenantId(event.target.value ? event.target.value : null)
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="">public</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
            }
            actions={
              <Button variant="outline" disabled={loading || saving} onClick={() => void reload()}>
                Atualizar
              </Button>
            }
          >
            <TenantsTable
              tenants={tenants}
              loading={loading}
              saving={saving}
              onEdit={setEditingTenant}
              onDelete={handleDelete}
            />
          </PainelSearchShell>
        </div>
      </div>
    </DetailShell>
  );
}
