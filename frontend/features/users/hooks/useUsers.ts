import { useEffect, useState } from "react";
import { fetchUsers } from "../services/userService";

export function useUsers() {
  const [users, setUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers().then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  return { users, loading };
}
