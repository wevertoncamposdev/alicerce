// components/DetailView/RelationView/RelationCard.tsx
//
// Server Component — Tabs/TabsList/TabsTrigger já são client components por dentro, não
// precisa de "use client" aqui (mesmo padrão do header em DetailView.tsx). Isso importa:
// `tab.icon` é uma referência de componente (LucideIcon), que só pode ser resolvida em
// `<Icon />` ANTES de cruzar uma fronteira client — nunca passada como prop crua.
import { Link2 } from "lucide-react";
import { Card } from "@components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import type { RelationTabConfig } from "@core/registry/types";

/** Relation card — docs/ui/detail-page.md §3: moldura + contador por aba. */
export function RelationCard({ tabs }: { tabs: RelationTabConfig[] }) {
    if (tabs.length === 0) return null;

    return (
        <Card className="p-0">
            <div className="flex items-center gap-2 px-5 pt-5 text-sm font-semibold">
                <Link2 className="size-4 text-muted-foreground" />
                <span>Relacionamentos</span>
            </div>

            <Tabs defaultValue={tabs[0].key} className="mt-3">
                <TabsList variant="line" className="w-full justify-start border-b px-5">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <TabsTrigger key={tab.key} value={tab.key}>
                                {Icon ? <Icon className="size-4" /> : null}
                                {tab.label}
                                {tab.count !== undefined ? (
                                    <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                                        ({tab.count})
                                    </span>
                                ) : null}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {tabs.map((tab) => (
                    <TabsContent key={tab.key} value={tab.key} className="p-5">
                        {tab.content}
                    </TabsContent>
                ))}
            </Tabs>
        </Card>
    );
}
