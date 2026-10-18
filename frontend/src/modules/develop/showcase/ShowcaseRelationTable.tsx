"use client";

// modules/develop/showcase/ShowcaseRelationTable.tsx
//
// Fixture de relation tab — mesma toolbar (busca + "Novo") de RelationListHost, mas sobre
// dados estáticos em memória, só pra validar o Relation card contra a referência visual.
import * as React from "react";
import { RelationListHost } from "@core/components/DetailView/RelationView/RelationListHost";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table";
import { EmptyState } from "@components/ui/empty-state";

type Row = Record<string, string>;

export function ShowcaseRelationTable({
    columns,
    rows,
    searchPlaceholder,
    addLabel,
    emptyMessage,
}: {
    columns: { key: string; header: string }[];
    rows: Row[];
    searchPlaceholder: string;
    addLabel: string;
    emptyMessage: string;
}) {
    const [searchText, setSearchText] = React.useState("");

    const filtered = React.useMemo(() => {
        const query = searchText.trim().toLowerCase();
        if (!query) return rows;
        return rows.filter((row) => Object.values(row).some((value) => value.toLowerCase().includes(query)));
    }, [rows, searchText]);

    return (
        <RelationListHost
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchPlaceholder={searchPlaceholder}
            filteredCount={filtered.length}
            addLabel={addLabel}
            onAdd={() => {}}
        >
            {filtered.length === 0 ? (
                <EmptyState title={emptyMessage} className="py-6" />
            ) : (
                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead key={col.key}>{col.header}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((row, index) => (
                                <TableRow key={index}>
                                    {columns.map((col) => (
                                        <TableCell key={col.key}>{row[col.key]}</TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </RelationListHost>
    );
}
