// components/DetailView/SectionCard.tsx
import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@components/ui/card";

type SectionCardProps = {
    title: string;
    icon?: LucideIcon;
    action?: React.ReactNode;
    children: React.ReactNode;
};

// Decisão do usuário: SectionCard não renderiza título/ícone/ação — informação
// considerada desnecessária pro usuário final (ver docs/ui/detail-page.md §3).
// `title`/`icon`/`action` continuam no tipo (chamadores em todo o app passam
// essas props) mas não são desestruturados, então não sobram como "não usados".
export function SectionCard({ children }: SectionCardProps) {
    return (
        <Card>
            <div className="px-5 pt-3 pb-5">{children}</div>
        </Card>
    );
}
