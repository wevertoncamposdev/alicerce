// modules/develop/components/DocBlocks.tsx
// Blocos de UI reutilizáveis para montar as páginas de documentação do /develop.
// Mantidos aqui (e não em components/ui) porque são específicos do conteúdo de docs,
// não componentes de design system genéricos.

import type { ReactNode } from "react";
import { Card } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { Separator } from "@components/ui/separator";
import { cn } from "@lib/utils";

// ------------------------------------------------------------
// Section: cabeçalho de seção com âncora (usado pela nav lateral)
// ------------------------------------------------------------
export function DocSection({
    id,
    title,
    kicker,
    children,
}: {
    id: string;
    title: string;
    kicker?: string;
    children: ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-20 pb-12">
            {kicker ? (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {kicker}
                </p>
            ) : null}
            <h2 className="mb-4 text-2xl font-bold tracking-tight">{title}</h2>
            <div className="space-y-4 text-sm leading-relaxed text-foreground/90">{children}</div>
        </section>
    );
}

export function DocSubTitle({ children }: { children: ReactNode }) {
    return <h3 className="mt-6 mb-2 text-base font-semibold text-foreground">{children}</h3>;
}

export function DocP({ children }: { children: ReactNode }) {
    return <p className="text-sm leading-relaxed text-foreground/90">{children}</p>;
}

// ------------------------------------------------------------
// Code: bloco de código com label opcional (arquivo/linguagem)
// ------------------------------------------------------------
export function DocCode({ label, children }: { label?: string; children: string }) {
    return (
        <div className="overflow-hidden rounded-lg border border-border bg-zinc-950">
            {label ? (
                <div className="border-b border-white/10 px-3 py-1.5 font-mono text-[11px] text-zinc-400">
                    {label}
                </div>
            ) : null}
            <pre className="overflow-x-auto p-3 text-[12.5px] leading-relaxed text-zinc-100">
                <code>{children.trim()}</code>
            </pre>
        </div>
    );
}

// ------------------------------------------------------------
// Callout: aviso / regra de ouro / cuidado
// ------------------------------------------------------------
const CALLOUT_STYLES: Record<string, string> = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
    rule: "border-violet-200 bg-violet-50 text-violet-900",
};

const CALLOUT_LABEL: Record<string, string> = {
    info: "Nota",
    warning: "Atenção",
    danger: "Cuidado",
    rule: "Regra de ouro",
};

export function DocCallout({
    type = "info",
    title,
    children,
}: {
    type?: "info" | "warning" | "danger" | "rule";
    title?: string;
    children: ReactNode;
}) {
    return (
        <div className={cn("rounded-lg border px-4 py-3 text-sm", CALLOUT_STYLES[type])}>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide">
                {title ?? CALLOUT_LABEL[type]}
            </p>
            <div className="leading-relaxed">{children}</div>
        </div>
    );
}

// ------------------------------------------------------------
// RouteTable: tabela simples de endpoints (método, rota, guarda, descrição)
// ------------------------------------------------------------
export type RouteRow = {
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "SEARCH";
    path: string;
    guard?: string;
    description: string;
};

const METHOD_COLOR: Record<RouteRow["method"], string> = {
    GET: "bg-emerald-100 text-emerald-800",
    POST: "bg-blue-100 text-blue-800",
    PATCH: "bg-amber-100 text-amber-800",
    PUT: "bg-amber-100 text-amber-800",
    DELETE: "bg-red-100 text-red-800",
    SEARCH: "bg-violet-100 text-violet-800",
};

export function DocRouteTable({ rows }: { rows: RouteRow[] }) {
    return (
        <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                        <th className="px-3 py-2 font-medium">Método</th>
                        <th className="px-3 py-2 font-medium">Rota</th>
                        <th className="px-3 py-2 font-medium">Guard/Decorator</th>
                        <th className="px-3 py-2 font-medium">Descrição</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                        <tr key={`${row.method}-${row.path}`}>
                            <td className="px-3 py-2">
                                <span
                                    className={cn(
                                        "rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold",
                                        METHOD_COLOR[row.method],
                                    )}
                                >
                                    {row.method}
                                </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-[12.5px]">{row.path}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{row.guard ?? "—"}</td>
                            <td className="px-3 py-2">{row.description}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ------------------------------------------------------------
// StepList: passo a passo numerado (para o guia de "criar módulo")
// ------------------------------------------------------------
export function DocStep({
    n,
    title,
    children,
}: {
    n: number;
    title: string;
    children: ReactNode;
}) {
    return (
        <Card className="p-4">
            <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {n}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-semibold text-foreground">{title}</p>
                    <div className="space-y-2 text-sm text-foreground/90">{children}</div>
                </div>
            </div>
        </Card>
    );
}

export function DocBadgeRow({ items }: { items: string[] }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
                <Badge key={item} variant="outline">
                    {item}
                </Badge>
            ))}
        </div>
    );
}

export function DocDivider() {
    return <Separator className="my-8" />;
}
