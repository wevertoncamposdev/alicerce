"use client";
import * as React from "react";
import { apiClient } from "@lib/api-client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Skeleton } from "@components/ui/skeleton";
import { EmptyState } from "@components/ui/empty-state";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@components/ui/table";

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
                const listPath = tenantId ? `${modelPath}?tenantId=${tenantId}` : modelPath;

                const response = await apiClient.get<Array<Entity> | { items?: Entity[]; total?: number; page?: number; limit?: number }>(listPath);

                if (!mounted) return;

                const rawItems = Array.isArray(response) ? response : response.items ?? [];
                const filteredItems = term
                    ? rawItems.filter((it) => {
                        const label = (it.name ?? it.email ?? it.resource ?? "").toLowerCase();
                        return label.includes(term.toLowerCase());
                    })
                    : rawItems;

                if (page === 0) setItems(filteredItems);
                else setItems((s) => [...s, ...filteredItems]);

                setHasMore(filteredItems.length === limit && rawItems.length >= limit);
            } catch (err) {
                console.error("RelationPicker load error", err);
                if (mounted) {
                    setItems([]);
                    setHasMore(false);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();
        return () => {
            mounted = false;
        };
    }, [kind, modelPath, tenantId, term, page]);

    const loadMore = () => {
        if (!hasMore || loading) return;
        setPage((p) => p + 1);
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-full sm:max-w-[720px]">
                <DialogHeader>
                    <DialogTitle>Buscar {kind}</DialogTitle>
                </DialogHeader>

                <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={`Pesquisar ${kind}`}
                />

                <div className="max-h-64 overflow-auto">
                    {loading && items.length === 0 ? (
                        <div className="space-y-2 py-1">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-8 w-full" />
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <EmptyState title="Nenhum item encontrado." className="py-6" />
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome / E-mail</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((it) => (
                                        <TableRow key={it.id}>
                                            <TableCell>{it.name ?? it.email ?? it.id}</TableCell>
                                            <TableCell>{it.type ?? it.resource ?? "—"}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    onClick={() => {
                                                        onSelect(it);
                                                        onClose();
                                                    }}
                                                >
                                                    Associar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {hasMore ? (
                                <div className="py-2 text-center">
                                    <Button variant="link" size="sm" onClick={loadMore} disabled={loading}>
                                        {loading ? "Carregando..." : "Carregar mais"}
                                    </Button>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
