// components/layout/AppTopbar.tsx

import { SidebarTrigger } from "@components/ui/sidebar";

type AppTopbarProps = {
    title: string;
    center?: React.ReactNode;
    autosave?: React.ReactNode;
    actions?: React.ReactNode;
};

export function AppTopbar({
    title,
    center,
    autosave,
    actions,
}: AppTopbarProps) {
    return (
        <div className="flex items-center gap-4 border-b px-2 py-2 sticky top-0 bg-background z-10">

            <div className="flex items-center gap-2 shrink-0">
                <SidebarTrigger />
                <h1 className="text-lg font-semibold">{title}</h1>
            </div>
            <div className="">
                {autosave}
            </div>
            <div className="flex-1 flex justify-center">
                {center}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {actions}
            </div>
        </div>
    );
}