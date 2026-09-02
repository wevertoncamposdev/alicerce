import type { AuditEntry } from "@/modules/audit/types/types";

export function AuditListView({ data }: { data: AuditEntry[] }) {
    return (
        <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                    <tr>
                        <th className="px-3 py-2">Ação</th>
                        <th className="px-3 py-2">Entidade</th>
                        <th className="px-3 py-2">Registro</th>
                        <th className="px-3 py-2">Usuário</th>
                        <th className="px-3 py-2">Data</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                                Nenhum registro encontrado.
                            </td>
                        </tr>
                    ) : (
                        data.map((entry) => (
                            <tr key={entry.id} className="border-t">
                                <td className="px-3 py-2">{entry.action}</td>
                                <td className="px-3 py-2">{entry.entity}</td>
                                <td className="px-3 py-2">{entry.entityId ?? "—"}</td>
                                <td className="px-3 py-2">{entry.user?.email ?? entry.userId}</td>
                                <td className="px-3 py-2">{entry.createdAt?.slice(0, 16).replace("T", ", ") ?? "—"}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
