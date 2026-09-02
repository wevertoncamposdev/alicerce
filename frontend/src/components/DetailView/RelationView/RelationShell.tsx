"use client";

import * as React from "react";

type Tab = {
    label: string;
    key: string;
    content: React.ReactNode;
};

export function RelationShell({ tabs }: { tabs: Tab[] }) {
    const [active, setActive] = React.useState<string>(tabs[0]?.key ?? "");

    React.useEffect(() => {
        if (!active && tabs[0]) setActive(tabs[0].key);
    }, [tabs, active]);

    const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

    return (
        <div>
            <div className="flex space-x-2 border-b mb-4">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setActive(t.key)}
                        className={`py-2 px-3 -mb-px ${t.key === active ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div>{activeTab?.content}</div>
        </div>
    );
}

export default RelationShell;
