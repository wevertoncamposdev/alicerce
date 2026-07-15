// components/layout/PageHeader.tsx
export function PageHeader({
    title,
    actions,
}: {
    title: string;
    actions?: React.ReactNode; // aqui entra o ViewSwitcher, botão de criar, etc.
}) {
    return (
        <div className="flex items-center justify-between border-b px-6 py-4 sticky top-0 bg-background z-10">
            <h1 className="text-lg font-semibold">{title}</h1>
            <div className="flex items-center gap-2">{actions}</div>
        </div>
    );
}