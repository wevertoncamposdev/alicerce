"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@components/ui/button";
import useApiError from "@/hooks/useApiError";
import { exportMyDataAction } from "@modules/perfil/config/export-action";

// Etapa 9.2 (LGPD) — baixa um JSON com os dados do próprio usuário. Leitura
// via Server Action (AGENTS §4.1.1); o download em si é client-side (Blob +
// link temporário), sem Route Handler novo.
export function ExportDataControl() {
    const formatError = useApiError();
    const [isExporting, setIsExporting] = React.useState(false);

    async function handleExport() {
        setIsExporting(true);

        try {
            const data = await exportMyDataAction();
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("[perfil] falha ao exportar dados", err);
            toast("Falha ao exportar seus dados", { description: formatError(err) });
        } finally {
            setIsExporting(false);
        }
    }

    return (
        <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
                Baixe um arquivo com seu perfil, sessões, consentimentos e atividade.
            </p>
            <Button variant="outline" disabled={isExporting} onClick={handleExport}>
                {isExporting ? "Gerando..." : "Exportar meus dados"}
            </Button>
        </div>
    );
}
