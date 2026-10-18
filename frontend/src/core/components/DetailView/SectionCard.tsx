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

export function SectionCard({ title, icon: Icon, action, children }: SectionCardProps) {
    return (
        <Card>
            <div className="flex items-center gap-2 px-5 pt-5 text-sm font-semibold">
                {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
                <span>{title}</span>
                {action ? <span className="ml-auto text-xs text-primary">{action}</span> : null}
            </div>
            <div className="px-5 pt-3 pb-5">{children}</div>
        </Card>
    );
}
