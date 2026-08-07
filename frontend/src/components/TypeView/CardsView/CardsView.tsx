import Link from "next/link";

export function CardsView<T extends { id: string | number; title: string }>({ data, detail }: { data: T[]; detail: string }) {
    if (data.length === 0) {
        return <p className="text-sm text-muted-foreground p-4">Nenhum item encontrado.</p>;
    }

    return (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {data.map((item) => (
                <Link key={item.id} href={`${detail}/${item.id}`} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <strong>{item.title}</strong>
                </Link>
            ))}
        </div>
    );
}