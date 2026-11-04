"use client";

import * as React from "react";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { Input } from "@components/ui/input";
import { Badge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/empty-state";
import { STATUS_BADGE_CLASSNAME } from "@core/components/DetailView/statusBadgeClasses";
import { attachTagAction, detachTagAction, searchTagsAction } from "@core/registry/actions";
import type { TagItem } from "./types";

function toneClassName(color: string): string {
    return STATUS_BADGE_CLASSNAME[color as keyof typeof STATUS_BADGE_CLASSNAME] ?? STATUS_BADGE_CLASSNAME.neutral;
}

// U6: sem `Command`/`Popover` novos no design system — um input com lista
// suspensa simples (relative/absolute) já resolve "digitar pra buscar ou
// criar", sem introduzir primitiva de UI nova (AGENTS.md §6, "não criar
// primitiva quando já existe uma — e quando não existe, a mais simples
// possível com o que já existe").
export function TagsPanel({
    entity,
    entityId,
    initialTags,
}: {
    entity: string;
    entityId: string;
    initialTags: TagItem[];
}) {
    const { hasPermission } = useAuth();
    const canManage = hasPermission(`${entity}.update`);

    const [tags, setTags] = React.useState(initialTags);
    const [query, setQuery] = React.useState("");
    const [suggestions, setSuggestions] = React.useState<{ id: string; name: string; color: string }[]>([]);
    const [open, setOpen] = React.useState(false);
    const [pending, setPending] = React.useState(false);

    React.useEffect(() => {
        if (!open) return;
        const trimmed = query.trim();
        const timer = setTimeout(async () => {
            const result = await searchTagsAction(trimmed || undefined);
            if (result.ok) setSuggestions(result.data);
        }, 250);
        return () => clearTimeout(timer);
    }, [query, open]);

    const attachedNames = React.useMemo(() => new Set(tags.map((t) => t.name.toLowerCase())), [tags]);
    const visibleSuggestions = suggestions.filter((s) => !attachedNames.has(s.name.toLowerCase()));
    const trimmedQuery = query.trim();
    const hasExactMatch = visibleSuggestions.some((s) => s.name.toLowerCase() === trimmedQuery.toLowerCase());

    async function handleAttachExisting(tagId: string) {
        setPending(true);
        const result = await attachTagAction(entity, entityId, { tagId });
        setPending(false);
        if (!result.ok) {
            toast("Falha ao anexar tag", { description: result.message });
            return;
        }
        setTags((s) => [...s, result.data]);
        setQuery("");
        setOpen(false);
    }

    async function handleCreateAndAttach() {
        if (!trimmedQuery) return;
        setPending(true);
        const result = await attachTagAction(entity, entityId, { name: trimmedQuery, color: "neutral" });
        setPending(false);
        if (!result.ok) {
            toast("Falha ao criar tag", { description: result.message });
            return;
        }
        setTags((s) => [...s, result.data]);
        setQuery("");
        setOpen(false);
    }

    async function handleDetach(tag: TagItem) {
        const previous = tags;
        setTags((s) => s.filter((t) => t.id !== tag.id));
        const result = await detachTagAction(tag.id);
        if (!result.ok) {
            toast("Falha ao remover tag", { description: result.message });
            setTags(previous);
        }
    }

    return (
        <div className="space-y-4">
            {tags.length === 0 ? (
                <EmptyState title="Nenhuma tag anexada." className="py-6" />
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                        <Badge key={tag.id} className={toneClassName(tag.color)}>
                            {tag.name}
                            {canManage ? (
                                <button
                                    type="button"
                                    aria-label={`Remover tag ${tag.name}`}
                                    className="ml-1 -mr-0.5 rounded-full hover:opacity-70"
                                    onClick={() => handleDetach(tag)}
                                >
                                    <X className="size-3" />
                                </button>
                            ) : null}
                        </Badge>
                    ))}
                </div>
            )}

            {canManage ? (
                <div className="relative">
                    <Input
                        value={query}
                        placeholder="Buscar ou criar uma tag"
                        disabled={pending}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setTimeout(() => setOpen(false), 150)}
                    />
                    {open && (visibleSuggestions.length > 0 || trimmedQuery) ? (
                        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
                            {visibleSuggestions.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleAttachExisting(s.id)}
                                >
                                    <Badge className={toneClassName(s.color)}>{s.name}</Badge>
                                </button>
                            ))}
                            {trimmedQuery && !hasExactMatch ? (
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={handleCreateAndAttach}
                                >
                                    <Plus className="size-3.5 text-muted-foreground" />
                                    Criar tag &quot;{trimmedQuery}&quot;
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
