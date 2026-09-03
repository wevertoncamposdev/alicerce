"use client";
import * as React from "react";
import { apiClient } from "@lib/api-client";

type Entity = { id: string; name?: string; email?: string; type?: string; resource?: string };

export default function RelationPicker({
    kind,
    tenantId,
    onSelect,
    onClose,
}: {
    kind: "permissions" | "users" | "roles";
    tenantId?: string | null;
    onSelect: (item: Entity) => void;
    onClose: () => void;
}) {
    const [q, setQ] = React.useState("");
    const [items, setItems] = React.useState<Entity[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [page, setPage] = React.useState(0);
    const limit = 20;
    const [hasMore, setHasMore] = React.useState(true);

    const modelPath = kind === "users" ? "user" : kind;

    // debounce search term
    const [term, setTerm] = React.useState("");
    React.useEffect(() => {
        const t = setTimeout(() => setTerm(q.trim()), 300);
        return () => clearTimeout(t);
    }, [q]);

    // load when kind, tenantId or term changes -> reset page
    React.useEffect(() => {
        setPage(0);
        setHasMore(true);
        setItems([]);
    }, [kind, tenantId, term]);

    React.useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            try {
                const body = {
                    searchText: term || undefined,
                    pagination: {
                        pageIndex: page,
                        pageSize: limit,
                    },
                    sort: [{ field: kind === "users" ? "email" : "name", direction: "asc" }],
                    filters: {},
                };

                const response = await apiClient.post<{ items?: Entity[]; total?: number; page?: number; limit?: number }>(
                    modelPath,
                    body,
                );

                if (!mounted) return;

                const nextItems = response.items ?? [];
                if (page === 0) setItems(nextItems);
                else setItems((s) => [...s, ...nextItems]);

                setHasMore((nextItems.length ?? 0) === limit);
            } catch (err) {
                console.error("RelationPicker load error", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();
        return () => {
            mounted = false;
        };
    }, [kind, modelPath, term, page]);

    const loadMore = () => {
        if (!hasMore || loading) return;
        setPage((p) => p + 1);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-md p-4 w-[720px] max-w-full shadow-lg">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium">Buscar {kind}</h3>
                    <button onClick={onClose} className="text-sm text-muted-foreground">Fechar</button>
                </div>

                <div className="mb-3">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={`Pesquisar ${kind}`}
                        className="w-full border rounded px-2 py-1"
                    />
                </div>

                <div className="max-h-64 overflow-auto">
                    {loading && items.length === 0 ? (
                        <p>Carregando...</p>
                    ) : items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum item encontrado.</p>
                    ) : (
                        <>
                            <table className="w-full table-auto">
                                <thead>
                                    <tr>
                                        <th className="text-left">Nome / E-mail</th>
                                        <th className="text-left">Tipo</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it) => (
                                        <tr key={it.id}>
                                            <td>{it.name ?? it.email ?? it.id}</td>
                                            <td>{it.type ?? it.resource ?? "—"}</td>
                                            <td className="text-right">
                                                <button
                                                    className="text-sm text-primary"
                                                    onClick={() => {
                                                        onSelect(it);
                                                        onClose();
                                                    }}
                                                >
                                                    Associar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="py-2 text-center">
                                {hasMore ? (
                                    <button className="text-sm text-primary" onClick={loadMore} disabled={loading}>
                                        {loading ? "Carregando..." : "Carregar mais"}
                                    </button>
                                ) : null}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
