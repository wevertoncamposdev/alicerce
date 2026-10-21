import { EmptyState } from "@components/ui/empty-state";

// `before`/`after` chegam parseados (objeto) quando vêm de GET /audit/:id
// (backend já faz JSON.parse — ver AuditService.findOne); se por algum
// motivo ainda chegar string (ex.: fixture), faz o parse aqui também.
function toRecord(value: unknown): Record<string, unknown> {
    if (value === null || value === undefined) return {};
    if (typeof value === "string") {
        try {
            const parsed: unknown = JSON.parse(value);
            return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
        } catch {
            return {};
        }
    }
    return typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

// Diff campo-a-campo antes/depois (Plano Base.md 8.5) — não tenta ser um
// diff de texto genérico, só compara os valores de cada chave presente em
// antes e/ou depois, destacando o que mudou.
export function AuditDiffView({ before, after }: { before: unknown; after: unknown }) {
    const beforeObj = toRecord(before);
    const afterObj = toRecord(after);
    const keys = [...new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])].sort();

    if (keys.length === 0) {
        return <EmptyState title="Sem alterações registradas para este evento." className="py-6" />;
    }

    return (
        <div className="overflow-hidden rounded-md border text-sm">
            <div className="grid grid-cols-[minmax(100px,1fr)_2fr_2fr] gap-2 bg-muted/50 px-3 py-2 font-medium">
                <span>Campo</span>
                <span>Antes</span>
                <span>Depois</span>
            </div>
            {keys.map((key) => {
                const beforeVal = beforeObj[key];
                const afterVal = afterObj[key];
                const changed = JSON.stringify(beforeVal) !== JSON.stringify(afterVal);
                return (
                    <div
                        key={key}
                        className={`grid grid-cols-[minmax(100px,1fr)_2fr_2fr] gap-2 border-t px-3 py-2 ${changed ? "bg-amber-500/5" : ""}`}
                    >
                        <span className="font-medium text-muted-foreground">{key}</span>
                        <span className={changed ? "text-muted-foreground line-through" : "text-muted-foreground"}>
                            {formatValue(beforeVal)}
                        </span>
                        <span className="text-foreground">{formatValue(afterVal)}</span>
                    </div>
                );
            })}
        </div>
    );
}
