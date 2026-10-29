"use client";

import * as React from "react";
import { toast } from "sonner";
import { Checkbox } from "@components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";
import useApiError from "@/hooks/useApiError";
import { replaceRolePermissions } from "@modules/roles/actions/roleService";
import type { PermissionMatrixViewModel, MatrixRow } from "@modules/roles/config/permission-matrix-view-model";

// Matriz módulo x ação (Plano Base.md 8.3 / endpoint da etapa 3.5): marcar
// um checkbox manda o CONJUNTO INTEIRO de permissões concedidas — não é um
// toggle individual, ver RolesService.replacePermissions. `initial` já
// chega com os rótulos prontos (resourceLabel/ação em português) — quem
// traduz é a Server Action (`roleService.ts`), nunca este componente
// (`entityLabel`/`permissionActionLabel` são `server-only`).
export function RolePermissionMatrix({ roleId, initial }: { roleId: string; initial: PermissionMatrixViewModel }) {
    const { hasPermission } = useAuth();
    const formatError = useApiError();
    const { setStatus } = useAutoSaveStatus();
    const canAssign = hasPermission("role.assign");

    const [view, setView] = React.useState(initial);
    const [pendingResource, setPendingResource] = React.useState<string | null>(null);

    function idsOf(row: MatrixRow): { allIds: string[]; grantedIds: string[] } {
        const allIds: string[] = [];
        const grantedIds: string[] = [];
        for (const column of view.columns) {
            const cell = row.cells[column.action];
            if (!cell) continue;
            allIds.push(cell.permissionId);
            if (cell.granted) grantedIds.push(cell.permissionId);
        }
        return { allIds, grantedIds };
    }

    async function commit(resource: string, grantedIdsInResource: Set<string>) {
        const previousView = view;
        const nextRows = view.rows.map((row) => {
            if (row.resource !== resource) return row;
            const nextCells = { ...row.cells };
            for (const action of Object.keys(nextCells)) {
                const cell = nextCells[action];
                if (!cell) continue;
                nextCells[action] = { ...cell, granted: grantedIdsInResource.has(cell.permissionId) };
            }
            return { ...row, cells: nextCells };
        });
        const allGrantedIds = nextRows.flatMap((row) =>
            Object.values(row.cells).filter((cell) => cell?.granted).map((cell) => cell!.permissionId),
        );

        setView({ ...view, rows: nextRows });
        setPendingResource(resource);
        setStatus("saving");
        try {
            const updated = await replaceRolePermissions(roleId, allGrantedIds);
            setView(updated);
            setStatus("saved");
        } catch (err) {
            setView(previousView);
            setStatus("error", "Falha ao atualizar permissões.");
            toast("Falha ao atualizar permissões", { description: formatError(err) });
        } finally {
            setPendingResource(null);
        }
    }

    if (view.rows.length === 0) {
        return <p className="text-sm text-muted-foreground">Nenhuma permissão cadastrada.</p>;
    }

    return (
        <div className="overflow-x-auto rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Módulo</TableHead>
                        {view.columns.map((col) => (
                            <TableHead key={col.action} className="text-center">{col.label}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {view.rows.map((row) => {
                        const { allIds, grantedIds } = idsOf(row);
                        const allChecked = allIds.length > 0 && grantedIds.length === allIds.length;
                        const someChecked = grantedIds.length > 0 && !allChecked;
                        const rowPending = pendingResource === row.resource;
                        return (
                            <TableRow key={row.resource}>
                                <TableCell>
                                    <Checkbox
                                        checked={someChecked ? "indeterminate" : allChecked}
                                        disabled={!canAssign || rowPending || allIds.length === 0}
                                        onCheckedChange={(checked) =>
                                            commit(row.resource, checked === true ? new Set(allIds) : new Set())
                                        }
                                        aria-label={`Selecionar todas as permissões de ${row.resourceLabel}`}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">{row.resourceLabel}</TableCell>
                                {view.columns.map((col) => {
                                    const cell = row.cells[col.action];
                                    if (!cell) {
                                        return <TableCell key={col.action} className="text-center text-muted-foreground">—</TableCell>;
                                    }
                                    return (
                                        <TableCell key={col.action} className="text-center">
                                            <Checkbox
                                                checked={cell.granted}
                                                disabled={!canAssign || rowPending}
                                                onCheckedChange={(checked) => {
                                                    const next = new Set(grantedIds);
                                                    if (checked === true) next.add(cell.permissionId); else next.delete(cell.permissionId);
                                                    commit(row.resource, next);
                                                }}
                                                aria-label={`${col.label} — ${row.resourceLabel}${cell.description ? `: ${cell.description}` : ""}`}
                                            />
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
