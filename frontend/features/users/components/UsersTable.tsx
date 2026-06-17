import { DataTable } from "@/components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui";
import { UserEntity } from "../user.types";

interface UsersTableProps {
  users: UserEntity[];
  loading?: boolean;
  saving?: boolean;
  onEdit: (user: UserEntity) => void;
  onDelete: (user: UserEntity) => Promise<void>;
}

export default function UsersTable({
  users,
  loading = false,
  saving = false,
  onEdit,
  onDelete,
}: UsersTableProps) {
  const columns: ColumnDef<UserEntity>[] = [
    {
      accessorKey: "email",
      header: "E-mail",
      cell: ({ row }) => <span>{row.original.email}</span>,
    },
    {
      id: "actions",
      header: "Acoes",
      cell: ({ row }) => {
        const user = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => onEdit(user)}
            >
              Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={saving}
              onClick={async () => {
                if (!window.confirm(`Deseja remover o usuario ${user.email}?`)) {
                  return;
                }

                await onDelete(user);
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
      data={users}
      isLoading={loading}
      loadingMessage="Carregando usuarios..."
      emptyMessage="Nenhum usuario encontrado."
    />
  );
}
