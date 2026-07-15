export function TimeLineView<T extends { id: string | number; title: string; createdAt: string }>({ data }: { data: T[] }) {
    const sorted = [...data].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return (
        <ol style={{ borderLeft: "2px solid #ccc", paddingLeft: 16 }}>
            {sorted.map((item) => (
                <li key={item.id} style={{ marginBottom: 12 }}>
                    <time style={{ fontSize: 12, color: "#888" }}>{new Date(item.createdAt).toLocaleDateString()}</time>
                    <div>{item.title}</div>
                </li>
            ))}
        </ol>
    );
}