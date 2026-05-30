import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="h-screen w-56 bg-zinc-900 text-white flex flex-col p-6 shadow-lg">
      <h2 className="text-xl font-bold mb-8">Menu</h2>
      <nav className="flex flex-col gap-4">
        <Link href="/main" className="hover:text-zinc-300">Dashboard</Link>
        <Link href="/main/users" className="hover:text-zinc-300">Usuários</Link>
        <Link href="/main/tenants" className="hover:text-zinc-300">Tenants</Link>
        <Link href="/main/roles" className="hover:text-zinc-300">Papéis</Link>
        <Link href="/main/permissions" className="hover:text-zinc-300">Permissões</Link>
        <Link href="/main/audit" className="hover:text-zinc-300">Auditoria</Link>
      </nav>
    </aside>
  );
}
