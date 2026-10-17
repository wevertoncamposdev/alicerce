// components/layout/RecordListHost.tsx
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