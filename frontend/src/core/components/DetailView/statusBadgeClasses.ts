// Mapa semântico de badge de status (docs/ui/detail-page.md §3) — nunca
// cor hexadecimal solta, só os tokens de app/globals.css. Reaproveitado por
// qualquer header de Detail que precise de um badge de status só-leitura
// (ex.: usuários, papéis).
export type StatusBadgeSemantic = "neutral" | "info" | "success" | "warning" | "danger";

export const STATUS_BADGE_CLASSNAME: Record<StatusBadgeSemantic, string> = {
    neutral: "bg-muted text-muted-foreground",
    info: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    danger: "bg-destructive/10 text-destructive",
};
