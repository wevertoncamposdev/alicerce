import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@lib/utils";

/**
 * Estado vazio padronizado — antes cada view escrevia seu próprio texto solto
 * (`<p>Nenhum item encontrado.</p>`), repetido em ~12 arquivos sem nenhum
 * componente em comum (ver PLAN.md P14). Funciona tanto solto numa página
 * quanto dentro de uma célula de tabela (`<td colSpan={n}>`), já que é só um
 * `<div>` flexível, não impõe estrutura de página.
 */
export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    action,
    className,
}: {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-1 py-10 text-center", className)}>
            <Icon className="mb-2 size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">{title}</p>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            {action ? <div className="mt-3">{action}</div> : null}
        </div>
    );
}
