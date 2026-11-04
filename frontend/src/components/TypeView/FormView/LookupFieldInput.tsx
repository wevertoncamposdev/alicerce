'use client';
// components/TypeView/FormView/LookupFieldInput.tsx
//
// U4 (docs/PLAN-fundacao-ux.md): tipo de campo `lookup` — busca outro registro e
// guarda o id. Mesmo conjunto de primitivas e o mesmo padrão de debounce do
// `RelationPicker` (components/RelationPicker/RelationPicker.tsx), só que genérico
// por `relatedModel`/`relatedLabelField` em vez de um union fixo de "kind", e
// reaproveitando `searchRecordsAction` direto — sem Server Action nova.
import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { searchRecordsAction } from "@core/registry/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Skeleton } from "@components/ui/skeleton";
import { EmptyState } from "@components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table";

type LookupEntity = { id: string } & Record<string, unknown>;

export function LookupFieldInput({
    name,
    value,
    defaultValue,
    onChange,
    onBlur,
    relatedModel,
    relatedLabelField,
    currentLabel,
    disabled,
}: {
    name: string;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    relatedModel: string;
    relatedLabelField?: string;
    /** Rótulo já resolvido do valor atual (`FormFieldConfig.relatedTitleField`) — sem
     * isso, mostra o id cru. */
    currentLabel?: string;
    disabled?: boolean;
}) {
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [term, setTerm] = React.useState("");
    const [items, setItems] = React.useState<LookupEntity[]>([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const timeout = setTimeout(() => setTerm(query.trim()), 300);
        return () => clearTimeout(timeout);
    }, [query]);

    React.useEffect(() => {
        if (!open) return;
        let mounted = true;

        async function load() {
            setLoading(true);
            try {
                const result = await searchRecordsAction<LookupEntity>(relatedModel, {
                    searchText: term || undefined,
                    pagination: { pageIndex: 0, pageSize: 20 },
                });
                if (mounted) setItems(result.data);
            } catch (err) {
                console.error("[LookupFieldInput]", err);
                if (mounted) setItems([]);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, [open, relatedModel, term]);

    function labelFor(item: LookupEntity): string {
        const raw = relatedLabelField ? item[relatedLabelField] : undefined;
        return typeof raw === "string" && raw ? raw : item.id;
    }

    function commit(next: string) {
        if (!isControlled) setInternalValue(next);
        onChange?.(next);
        onBlur?.();
    }

    const displayLabel = currentLabel || currentValue;
    const href = currentValue ? `/${relatedModel}/${currentValue}` : undefined;

    return (
        <div className="flex items-center gap-2">
            <input type="hidden" name={name} value={currentValue} />
            {currentValue ? (
                href ? (
                    <Link href={href} className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:underline">
                        {displayLabel}
                    </Link>
                ) : (
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{displayLabel}</span>
                )
            ) : (
                <span className="flex-1 text-sm text-muted-foreground">Nenhum selecionado.</span>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} disabled={disabled}>
                Buscar
            </Button>
            {currentValue ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => commit("")}
                    disabled={disabled}
                    aria-label="Remover seleção"
                >
                    <X className="size-4" />
                </Button>
            ) : null}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="w-full sm:max-w-[640px]">
                    <DialogHeader>
                        <DialogTitle>Buscar</DialogTitle>
                    </DialogHeader>

                    <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar..." />

                    <div className="max-h-64 overflow-auto">
                        {loading && items.length === 0 ? (
                            <div className="space-y-2 py-1">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <Skeleton key={index} className="h-8 w-full" />
                                ))}
                            </div>
                        ) : items.length === 0 ? (
                            <EmptyState title="Nenhum item encontrado." className="py-6" />
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{labelFor(item)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    onClick={() => {
                                                        commit(item.id);
                                                        setOpen(false);
                                                    }}
                                                >
                                                    Selecionar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
