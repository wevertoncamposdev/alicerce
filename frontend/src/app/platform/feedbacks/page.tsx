import { MessageSquare } from "lucide-react";
import { platformApiServer } from "@lib/platform-api-server";
import { EmptyState } from "@components/ui/empty-state";
import { Badge } from "@components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table";

interface ManagementFeedback {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  tenant: { legalName: string; slug: string };
}

interface ManagementFeedbacksResponse {
  items: ManagementFeedback[];
  total: number;
}

export default async function PlatformFeedbacksPage() {
  const { items, total } = await platformApiServer.get<ManagementFeedbacksResponse>(
    "management/feedbacks",
  );

  if (items.length === 0) {
    return <EmptyState icon={MessageSquare} title="Nenhum feedback recebido ainda" />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">
        Feedbacks ({total}) — todas as instituições
      </h1>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Instituição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((feedback) => (
              <TableRow key={feedback.id}>
                <TableCell className="font-medium">{feedback.title}</TableCell>
                <TableCell>{feedback.tenant.legalName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{feedback.status}</Badge>
                </TableCell>
                <TableCell>
                  {new Date(feedback.createdAt).toLocaleDateString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
