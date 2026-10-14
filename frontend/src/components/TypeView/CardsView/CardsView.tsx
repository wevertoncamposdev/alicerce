import Link from "next/link";
import { EmptyState } from "@components/ui/empty-state";
import { Card, CardContent } from "@components/ui/card";

export function CardsView<T extends { id: string | number; title: string }>({ data, detail }: { data: T[]; detail: string }) {
    if (data.length === 0) {
        return <EmptyState title="Nenhum item encontrado." />;
    }

    return (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {data.map((item) => (
                <Link key={item.id} href={`${detail}/${item.id}`} className="block transition-shadow hover:shadow-md">
                    <Card>
                        <CardContent>
                            <span className="font-medium text-foreground">{item.title}</span>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}