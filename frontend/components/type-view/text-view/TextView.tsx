export function TextView<T extends { id: string | number; title: string }>({ data }: { data: T[] }) {
    if (data.length === 0) {
        return <p className="text-sm text-muted-foreground p-4">Nenhum item encontrado.</p>;
    }

    return (
        <div className="space-y-2 p-4">
            <h1 className="text-lg font-semibold">Dados</h1>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}