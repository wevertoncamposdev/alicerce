// components/layout/RecordListHost.tsx
'use server'
import type { ReactNode } from "react";

type Props = {
    children: ReactNode;
};

export function RecordListHost({
    children,
}: Props) {
    return (
        <div className="space-y-4">
            {children}
        </div>
    );
}