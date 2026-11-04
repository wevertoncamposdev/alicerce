"use client";

import * as React from "react";
import { Pin, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { Button } from "@components/ui/button";
import { Textarea } from "@components/ui/textarea";
import { Badge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/empty-state";
import { createNoteAction, updateNoteAction, deleteNoteAction } from "@core/registry/actions";
import { formatAuditDate } from "./format";
import type { NoteItem } from "./types";

// U6 (docs/PLAN-fundacao-ux.md, ADR 0014): `entity` já é o prefixo exato
// do catálogo de permissões (ex. "feedback") — `hasPermission` recebe o
// nome direto, sem precisar de `resolveActionPermission` (esse mapeia
// `<moduleKey>.<action>`, pensado pro Detail de um módulo só). Checagem
// aqui é só estética: quem não é autor nem tem a permissão simplesmente
// não vê os controles — o backend sempre confere de novo.
export function NotesPanel({
    entity,
    entityId,
    initialNotes,
}: {
    entity: string;
    entityId: string;
    initialNotes: NoteItem[];
}) {
    const { user, hasPermission } = useAuth();
    const { confirm, dialog } = useConfirmDialog();
    const canManage = hasPermission(`${entity}.update`);

    const [notes, setNotes] = React.useState(initialNotes);
    const [draft, setDraft] = React.useState("");
    const [pending, setPending] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editDraft, setEditDraft] = React.useState("");

    const sorted = React.useMemo(
        () =>
            [...notes].sort(
                (a, b) =>
                    Number(b.pinned) - Number(a.pinned) ||
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            ),
        [notes],
    );

    async function handleCreate() {
        const body = draft.trim();
        if (!body) return;

        setPending(true);
        const result = await createNoteAction(entity, entityId, body);
        setPending(false);

        if (!result.ok) {
            toast("Falha ao criar nota", { description: result.message });
            return;
        }
        setNotes((s) => [result.data, ...s]);
        setDraft("");
    }

    async function handleTogglePin(note: NoteItem) {
        const result = await updateNoteAction(note.id, { pinned: !note.pinned });
        if (!result.ok) {
            toast("Falha ao atualizar nota", { description: result.message });
            return;
        }
        setNotes((s) => s.map((n) => (n.id === note.id ? result.data : n)));
    }

    async function handleSaveEdit(note: NoteItem) {
        const body = editDraft.trim();
        if (!body) return;

        const result = await updateNoteAction(note.id, { body });
        if (!result.ok) {
            toast("Falha ao editar nota", { description: result.message });
            return;
        }
        setNotes((s) => s.map((n) => (n.id === note.id ? result.data : n)));
        setEditingId(null);
    }

    async function handleDelete(note: NoteItem) {
        const confirmed = await confirm({
            title: "Remover esta nota?",
            description: "Essa ação não pode ser desfeita.",
            destructive: true,
        });
        if (!confirmed) return;

        const result = await deleteNoteAction(note.id);
        if (!result.ok) {
            toast("Falha ao remover nota", { description: result.message });
            return;
        }
        setNotes((s) => s.filter((n) => n.id !== note.id));
    }

    return (
        <div className="space-y-4">
            {canManage ? (
                <div className="space-y-2">
                    <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Escrever uma nota..."
                        rows={3}
                    />
                    <div className="flex justify-end">
                        <Button size="sm" onClick={handleCreate} disabled={pending || !draft.trim()}>
                            Adicionar nota
                        </Button>
                    </div>
                </div>
            ) : null}

            {sorted.length === 0 ? (
                <EmptyState title="Nenhuma nota ainda." className="py-6" />
            ) : (
                <div className="space-y-3">
                    {sorted.map((note) => {
                        const canEdit = note.authorId === user?.id || canManage;
                        const isEditing = editingId === note.id;

                        return (
                            <div key={note.id} className="rounded-md border p-3 text-sm">
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">{note.authorName}</span>
                                        <span>·</span>
                                        <span>{formatAuditDate(note.createdAt)}</span>
                                        {note.pinned ? <Badge className="ml-1">Fixada</Badge> : null}
                                    </div>
                                    {canEdit ? (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-6"
                                                title={note.pinned ? "Desafixar" : "Fixar"}
                                                onClick={() => handleTogglePin(note)}
                                            >
                                                <Pin className="size-3.5" />
                                            </Button>
                                            {!isEditing ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-6"
                                                    title="Editar"
                                                    onClick={() => {
                                                        setEditingId(note.id);
                                                        setEditDraft(note.body);
                                                    }}
                                                >
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                            ) : null}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-6"
                                                title="Remover"
                                                onClick={() => handleDelete(note)}
                                            >
                                                <Trash2 className="size-3.5 text-destructive" />
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>

                                {isEditing ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={editDraft}
                                            onChange={(e) => setEditDraft(e.target.value)}
                                            rows={3}
                                        />
                                        <div className="flex justify-end gap-1.5">
                                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                                                <X className="size-3.5" />
                                                Cancelar
                                            </Button>
                                            <Button size="sm" onClick={() => handleSaveEdit(note)}>
                                                <Check className="size-3.5" />
                                                Salvar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="whitespace-pre-wrap text-foreground">{note.body}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {dialog}
        </div>
    );
}
