export function CardsView<T extends { id: string | number; title: string }>({ data }: { data: T[] }) {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {data.map((item) => (
                <div key={item.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
                    <strong>{item.title}</strong>
                </div>
            ))}
        </div>
    );
}