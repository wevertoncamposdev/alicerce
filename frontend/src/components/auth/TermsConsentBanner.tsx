"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@components/ui/button";
import { acceptCurrentTerms } from "./accept-consent-action";

// Bloqueio suave da etapa 9.1 (LGPD): banner persistente enquanto o usuário
// não aceitar a versão atual dos termos — não bloqueia API nem navegação,
// só fica visível até o "Aceitar" (mesmo padrão do aviso de e-mail não
// verificado, etapa 7.5, ao lado deste banner na layout autenticada).
export function TermsConsentBanner() {
    const router = useRouter();
    const [isAccepting, setIsAccepting] = useState(false);

    async function handleAccept() {
        setIsAccepting(true);

        try {
            await acceptCurrentTerms();
            router.refresh();
        } catch (err) {
            console.error("[auth] falha ao aceitar os termos", err);
            toast("Falha ao aceitar os termos", {
                description: err instanceof Error ? err.message : "Tente novamente.",
            });
        } finally {
            setIsAccepting(false);
        }
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            <span>Atualizamos nossos Termos de Uso. Revise e aceite para continuar.</span>
            <Button size="sm" variant="outline" disabled={isAccepting} onClick={handleAccept}>
                {isAccepting ? "Aceitando..." : "Aceitar novos termos"}
            </Button>
        </div>
    );
}
