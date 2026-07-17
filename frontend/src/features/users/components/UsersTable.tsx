
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@components/ui/button";
import { UserEntity } from "@/features/users/user.types";

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

  return (
    <pre>
      {JSON.stringify(users, null, 2)}
    </pre>
  );
}
