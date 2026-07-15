// components/layout/AppTopbar.tsx
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppTopbar({
    title,
    actions,
}: {
    title: string;
    actions?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between border-b px-2 py-2 sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2">
                <SidebarTrigger />
                <h1 className="text-lg font-semibold">{title}</h1>
            </div>
            <div className="flex items-center gap-2">{actions}</div>
        </div>
    );
}