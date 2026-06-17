
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useAudit } from "@/features/audit/hooks/useAudit";
import { DetailShell, PainelSearchShell } from "@/components/shells";
import { TypeView } from "@/components/TypeView";
import { ColumnDef } from "@tanstack/react-table";
import { AuditEntry } from "@/features/audit/audit.types";
import { Button } from "@/components/ui";

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

export default function AuditPage() {
  const { token, currentTenantId } = useAuth();
  const { entries, loading, error, reload } = useAudit({
    tenantId: currentTenantId,
    token,
  });

  const auditColumns: ColumnDef<AuditEntry>[] = [
    {
      accessorKey: "createdAt",
      header: "Data",
      cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
    },
    {
      accessorKey: "action",
      header: "Acao",
      cell: ({ row }) => <span>{row.original.action}</span>,
    },
    {
      accessorKey: "entity",
      header: "Entidade",
      cell: ({ row }) => <span>{row.original.entity}</span>,
    },
    {
      accessorKey: "userId",
      header: "Usuario",
      cell: ({ row }) => <span>{row.original.userId}</span>,
    },
  ];

  return (
    <DetailShell
      title="Auditoria"
      description="Consulta de logs com composicao arquitetural da Fase 2."
      error={error}
    >
      {!currentTenantId ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Selecione um tenant no modulo de tenants para consultar a auditoria.
        </div>
      ) : null}

      <PainelSearchShell
        title="Registros"
        actions={
          <Button
            type="button"
            onClick={() => void reload()}
            disabled={loading || !currentTenantId}
          >
            {loading ? "Carregando..." : "Atualizar"}
          </Button>
        }
      >
        <TypeView
          mode="table"
          data={entries}
          columns={auditColumns}
          isLoading={loading}
          loadingMessage="Carregando registros..."
          emptyMessage="Nenhum registro encontrado."
        />
      </PainelSearchShell>
    </DetailShell>
  );
}
