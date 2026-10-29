import { Building2 } from "lucide-react";
import { platformApiServer } from "@lib/platform-api-server";
import { EmptyState } from "@components/ui/empty-state";
import { Button } from "@components/ui/index";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table";
import { defineEnum } from "@core/registry/enum";
import { EnumBadge } from "@core/components/DetailView/EnumBadge";
import { updateTenantStatusAction } from "./actions";

interface ManagementTenant {
  id: string;
  legalName: string;
  slug: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "ARCHIVED";
  userCount: number;
  feedbackCount: number;
}

// U2 (docs/PLAN-fundacao-ux.md): mesmo enum `Status` do Prisma que User
// usa (`modules/users/components/UserStatusBadge.tsx`) — tela de
// platform-admin, fora do registry de módulos, então o enum fica local.
const TenantStatusEnum = defineEnum("TenantStatus", {
  ACTIVE: { label: "Ativa", tone: "success" },
  INACTIVE: { label: "Inativa", tone: "neutral" },
  SUSPENDED: { label: "Suspensa", tone: "warning" },
  ARCHIVED: { label: "Arquivada", tone: "danger" },
});

export default async function PlatformTenantsPage() {
  const tenants = await platformApiServer.get<ManagementTenant[]>("management/tenants");

  if (tenants.length === 0) {
    return <EmptyState icon={Building2} title="Nenhuma instituição cadastrada" />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Instituições</h1>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instituição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead>Feedbacks</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => {
              const nextStatus = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
              return (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="font-medium">{tenant.legalName}</div>
                    <div className="text-xs text-muted-foreground">{tenant.slug}</div>
                  </TableCell>
                  <TableCell>
                    <EnumBadge enumDef={TenantStatusEnum} value={tenant.status} />
                  </TableCell>
                  <TableCell>{tenant.userCount}</TableCell>
                  <TableCell>{tenant.feedbackCount}</TableCell>
                  <TableCell className="text-right">
                    <form action={updateTenantStatusAction}>
                      <input type="hidden" name="tenantId" value={tenant.id} />
                      <input type="hidden" name="status" value={nextStatus} />
                      <Button type="submit" variant="outline" size="sm">
                        {tenant.status === "ACTIVE" ? "Suspender" : "Reativar"}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
