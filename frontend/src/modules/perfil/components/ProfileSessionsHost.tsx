"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import { RelationHost, type RelationHostConfig } from "@core/registry/relation-host";
import { toast } from "sonner";
import useApiError from "@/hooks/useApiError";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";
import { revokeSessionAction } from "@modules/perfil/config/sessions-provider";
import type { MeSession } from "@modules/perfil/types/types";

export function ProfileSessionsHost({ initial }: { initial: MeSession[] }) {
    const formatError = useApiError();
    const { setStatus } = useAutoSaveStatus();

    const columns = React.useMemo<ColumnDef<AppTableFeatures, MeSession>[]>(
        () => [
            {
                accessorKey: "userAgent",
                header: "Dispositivo",
                cell: ({ row }) => (
                    <span>
                        {row.original.userAgent ?? "—"}
                        {row.original.isCurrent ? (
                            <span className="ml-2 text-xs text-muted-foreground">(sessão atual)</span>
                        ) : null}
                    </span>
                ),
            },
            { accessorKey: "ip", header: "IP", cell: ({ row }) => row.original.ip ?? "—" },
            {
                accessorKey: "lastUsedAt",
                header: "Último uso",
                cell: ({ row }) =>
                    row.original.lastUsedAt
                        ? new Date(row.original.lastUsedAt).toLocaleString("pt-BR")
                        : "—",
            },
        ],
        [],
    );

    const config = React.useMemo<RelationHostConfig<MeSession>>(
        () => ({
            title: "Sessões ativas",
            columns,
            initialData: initial,
            idAccessor: (session) => session.familyId,
            emptyMessage: "Nenhuma sessão ativa.",
            confirmDetachTitle: "Encerrar esta sessão?",
            confirmDetachDescription: "O dispositivo vai precisar entrar de novo.",
            onDetach: async (familyId: string) => {
                const target = initial.find((session) => session.familyId === familyId);
                if (target?.isCurrent) {
                    toast("Não é possível encerrar a sessão atual por aqui", {
                        description: "Use \"Sair\" no menu do usuário.",
                    });
                    throw new Error("current-session");
                }

                setStatus("saving");
                try {
                    await revokeSessionAction(familyId);
                    setStatus("saved");
                    toast("Sessão encerrada");
                } catch (err) {
                    console.error("[perfil] falha ao encerrar sessão", err);
                    setStatus("error", "Falha ao encerrar a sessão.");
                    toast("Falha ao encerrar sessão", { description: formatError(err) });
                    throw err;
                }
            },
        }),
        [columns, formatError, initial, setStatus],
    );

    return <RelationHost config={config} initial={initial} />;
}
