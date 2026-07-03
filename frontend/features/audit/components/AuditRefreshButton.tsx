"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export default function AuditRefreshButton() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    return (
        <Button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => router.refresh())}
        >
            {isPending ? "Carregando..." : "Atualizar"}
        </Button>
    );
}
