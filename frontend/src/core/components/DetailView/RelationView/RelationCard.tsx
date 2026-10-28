// components/DetailView/RelationView/RelationCard.tsx
//
// Server Component — Tabs/TabsList/TabsTrigger já são client components por dentro, não
// precisa de "use client" aqui (mesmo padrão do header em DetailView.tsx). Isso importa:
// `tab.icon` é uma referência de componente (LucideIcon), que só pode ser resolvida em
// `<Icon />` ANTES de cruzar uma fronteira client — nunca passada como prop crua.
import { Card } from "@components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import type { RelationTabConfig } from "@core/registry/types";

// Relation card — docs/ui/detail-page.md §3: moldura + contador por aba.
// Decisão do usuário: sem o header "Relacionamentos" acima das abas —
// informação desnecessária pro usuário final.
export function RelationCard({ tabs }: { tabs: RelationTabConfig[] }) {
    if (tabs.length === 0) return null;

    return (
        <Card className="p-0">
            <Tabs defaultValue={tabs[0].key}>
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
