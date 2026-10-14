"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";

type Tab = {
    label: string;
    key: string;
    content: React.ReactNode;
};

export function RelationShell({ tabs }: { tabs: Tab[] }) {
    if (tabs.length === 0) return null;

    return (
        <Tabs defaultValue={tabs[0].key}>
            <TabsList variant="line" className="mb-4 w-full justify-start border-b">
                {tabs.map((t) => (
                    <TabsTrigger key={t.key} value={t.key}>
                        {t.label}
                    </TabsTrigger>
                ))}
            </TabsList>

            {tabs.map((t) => (
                <TabsContent key={t.key} value={t.key}>
                    {t.content}
                </TabsContent>
            ))}
        </Tabs>
    );
}

export default RelationShell;
