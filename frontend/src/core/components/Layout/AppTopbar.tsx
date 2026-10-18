// components/layout/AppTopbar.tsx

import { SidebarTrigger } from "@components/ui/sidebar";
import { Breadcrumbs, type BreadcrumbItem } from "@core/components/Layout/Breadcrumbs";

type AppTopbarProps = {
    title: string;
    /** Quando presente, substitui `title` por um `Breadcrumbs` (ex.: "Feedbacks / <título>"). */
    breadcrumb?: BreadcrumbItem[];
    center?: React.ReactNode;
    autosave?: React.ReactNode;
    actions?: React.ReactNode;
};

export function AppTopbar({
    title,
    breadcrumb,
    center,
    autosave,
    actions,
}: AppTopbarProps) {
    return (
        <div className="flex items-center gap-4 border-b px-2 py-2 sticky top-0 bg-background z-10">

            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger />
                {breadcrumb ? <Breadcrumbs items={breadcrumb} /> : <h1 className="text-page-title shrink-0">{title}</h1>}
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