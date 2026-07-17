'use client';

import { Cloud, CloudUpload, CloudAlert } from "lucide-react";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";

const statusConfig = {
    idle: null,
    saving: { icon: CloudUpload, label: "Salvando...", className: "text-blue-500 animate-pulse" },
    saved: { icon: Cloud, label: "Salvo", className: "text-muted-foreground" },
    error: { icon: CloudAlert, label: "Erro ao salvar", className: "text-destructive" },
} as const;

export function AutoSaveIndicator() {
    const { status, errorMessage } = useAutoSaveStatus();
    const config = statusConfig[status];

    if (!config) return null;

    const { icon: Icon, label, className } = config;

    return (
        <p className="text-xs flex items-center gap-2">
            <Icon width={16} height={16} className={className} />
            {status === "error" ? errorMessage ?? label : label}
        </p>
    );
}