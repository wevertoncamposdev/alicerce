"use client";

// modules/develop/showcase/ShowcaseRelationTable.tsx
//
// Fixture de relation tab — mesma toolbar (busca + "Novo") de RelationListHost, mas sobre
// dados estáticos em memória, só pra validar o Relation card contra a referência visual.
import * as React from "react";
import Link from "next/link";
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
    linkKey,
}: {
    columns: { key: string; header: string }[];
    rows: Row[];
    searchPlaceholder: string;
    addLabel: string;
    emptyMessage: string;
    /**
     * Chave em `row` com o href do Detail do item (ex.: "href") — primeira coluna vira
     * link. String, não função: este componente é client e `rows` vem de um Server
     * Component (contract.tsx), então o link precisa ser dado já resolvido, não callback.
     */
    linkKey?: string;
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
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead key={col.key}>{col.header}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((row, index) => {
                                const rowPath = linkKey ? row[linkKey] : undefined;
                                return (
                                    <TableRow key={index}>
                                        {columns.map((col, colIndex) =>
                                            rowPath && colIndex === 0 ? (
                                                <TableCell key={col.key}>
                                                    <Link href={rowPath} className="font-medium text-foreground hover:underline">
                                                        {row[col.key]}
                                                    </Link>
                                                </TableCell>
                                            ) : (
                                                <TableCell key={col.key}>{row[col.key]}</TableCell>
                                            ),
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </RelationListHost>
    );
}
