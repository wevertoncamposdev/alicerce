"use client";
import UsersTable from "@/features/users/components/UsersTable";

export default function UsersPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Usuários</h2>
      <UsersTable />
    </div>
  );
}
