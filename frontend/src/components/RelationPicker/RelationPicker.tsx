"use client";
import * as React from "react";
import { searchRecordsAction } from "@core/registry/actions";
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
    onSelect,
    onClose,
}: {
    kind: "permissions" | "users" | "roles";
    onSelect: (item: Entity) => void;
    onClose: () => void;
}) {
    const [q, setQ] = React.useState("");
    const [items, setItems] = React.useState<Entity[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [page, setPage] = React.useState(0);
    const limit = 20;
    const [hasMore, setHasMore] = React.useState(true);

    // debounce search term
    const [term, setTerm] = React.useState("");
    React.useEffect(() => {
        const t = setTimeout(() => setTerm(q.trim()), 300);
        return () => clearTimeout(t);
    }, [q]);

    // load when kind or term changes -> reset page.
    // Ajuste de estado durante o render (não um useEffect) — mesmo padrão já
    // usado em relation-host.tsx: compara a chave atual com a anterior e
    // reseta síncrono, sem o render em cascata extra de um setState dentro
    // de efeito (ver "Adjusting state based on a prop change" na doc do React).
    const resetKey = `${kind}:${term}`;
    const [prevResetKey, setPrevResetKey] = React.useState(resetKey);
    if (resetKey !== prevResetKey) {
        setPrevResetKey(resetKey);
        setPage(0);
        setHasMore(true);
        setItems([]);
    }

    React.useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            try {
                // Busca e paginação reais no servidor — nada de filtro client-side
                // sobre a página crua (ver AGENTS §4.1.9).
                const result = await searchRecordsAction<Entity>(kind, {
                    searchText: term || undefined,
                    pagination: { pageIndex: page, pageSize: limit },
                });

                if (!mounted) return;

                if (page === 0) setItems(result.data);
                else setItems((s) => [...s, ...result.data]);

                setHasMore(result.pagination.page < result.pagination.pages);
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
    }, [kind, term, page]);

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
