import { useUsers } from "../hooks/useUsers";
import { DataTable } from "@/components/DataTable";
import { ColumnDef } from "@tanstack/react-table";

export default function UsersTable() {
  const { users, loading } = useUsers();

  const columns: ColumnDef<{ id: number; name: string; email: string }>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => <span>{row.original.name}</span>,
    },
    {
      accessorKey: "email",
      header: "E-mail",
      cell: ({ row }) => <span>{row.original.email}</span>,
    },
  ];

  if (loading) {
    return <div className="text-zinc-500">Carregando...</div>;
  }

  return <DataTable columns={columns} data={users} />;
}
