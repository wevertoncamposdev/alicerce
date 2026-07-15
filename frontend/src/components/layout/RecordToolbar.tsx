import type React from "react";

type Props = {
    search?: React.ReactNode;
    actions?: React.ReactNode;
};

export function RecordToolbar({
    search,
    actions,
}: Props) {
    return (
        <div className="flex items-center justify-between gap-4 w-full">
            <div className="flex-1">
                {search}
            </div>

            {actions}
        </div>
    );
}