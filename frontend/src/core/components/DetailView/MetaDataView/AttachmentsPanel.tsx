"use client";

import * as React from "react";
import { Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { Button } from "@components/ui/button";
import { EmptyState } from "@components/ui/empty-state";
import { uploadFileAction, deleteAttachmentAction } from "@core/registry/actions";
import { formatAuditDate } from "./format";
import type { AttachmentItem } from "./types";

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsPanel({
    entity,
    entityId,
    initialAttachments,
}: {
    entity: string;
    entityId: string;
    initialAttachments: AttachmentItem[];
}) {
    const { hasPermission } = useAuth();
    const { confirm, dialog } = useConfirmDialog();
    const canManage = hasPermission(`${entity}.update`);

    const [attachments, setAttachments] = React.useState(initialAttachments);
    const [uploading, setUploading] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            // `ownerType` precisa vir ANTES de `file` — ver comentário em
            // FormView.tsx/file.controller.ts (@fastify/multipart só
            // acumula `.fields` com o que leu antes do primeiro arquivo).
            formData.append("ownerType", entity);
            formData.append("ownerId", entityId);
            formData.append("file", file);

            const uploaded = await uploadFileAction(formData);
            setAttachments((s) => [
                {
                    id: uploaded.id,
                    name: file.name,
                    mime: uploaded.mime,
                    size: file.size,
                    createdAt: new Date().toISOString(),
                    contentHref: `/api/proxy/files/${uploaded.id}/content`,
                },
                ...s,
            ]);
        } catch (err) {
            console.error("attachment upload failed", err);
            toast("Falha ao enviar anexo", {
                description: err instanceof Error ? err.message : undefined,
            });
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(attachment: AttachmentItem) {
        const confirmed = await confirm({
            title: "Remover este anexo?",
            description: "Essa ação não pode ser desfeita.",
            destructive: true,
        });
        if (!confirmed) return;

        const previous = attachments;
        setAttachments((s) => s.filter((a) => a.id !== attachment.id));
        const result = await deleteAttachmentAction(attachment.id);
        if (!result.ok) {
            toast("Falha ao remover anexo", { description: result.message });
            setAttachments(previous);
        }
    }

    return (
        <div className="space-y-4">
            {canManage ? (
                <div>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,application/pdf"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <Button size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
                        <Upload className="size-3.5" />
                        {uploading ? "Enviando..." : "Anexar arquivo"}
                    </Button>
                </div>
            ) : null}

            {attachments.length === 0 ? (
                <EmptyState title="Nenhum anexo." className="py-6" />
            ) : (
                <div className="space-y-2">
                    {attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center gap-2.5 rounded-md border p-2.5 text-sm">
                            <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                            <a
                                href={attachment.contentHref}
                                target="_blank"
                                rel="noreferrer"
                                className="min-w-0 flex-1 truncate font-medium text-foreground hover:underline"
                            >
                                {attachment.name}
                            </a>
                            <span className="shrink-0 text-xs text-muted-foreground">
                                {formatBytes(attachment.size)} · {formatAuditDate(attachment.createdAt)}
                            </span>
                            {canManage ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 shrink-0"
                                    title="Remover"
                                    onClick={() => handleDelete(attachment)}
                                >
                                    <Trash2 className="size-3.5 text-destructive" />
                                </Button>
                            ) : null}
                        </div>
                    ))}
                </div>
            )}
            {dialog}
        </div>
    );
}
