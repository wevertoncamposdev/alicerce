// core/data-provider/json.ts
//
// U1 (docs/PLAN-fundacao-ux.md): motor de dados em memória, mesmo
// contrato dos handlers REST (`RecordModuleDataHandlers`) — só pra
// módulos de demonstração (`modules/develop/demo/**`), nunca pra módulo
// de domínio real.
//
// Estado em array fechado no closure, um por chamada: `AGENTS.md`
// §4.1.6 proíbe `Map`/estado em escopo de módulo porque mistura dado
// entre tenants reais. Aqui não existe tenant real — é fixture de UI,
// nunca ativa em produção de verdade (ver `app/(app)/develop/layout.tsx`,
// gate por `NODE_ENV`/`DEMO_MODE`). O estado vive enquanto o processo do
// servidor de dev viver, compartilhado entre quem acessar — aceitável
// porque é só isso: uma demonstração, não dado de ninguém de verdade.
import type { SearchArgs, SearchResult } from "./types";
import type { RecordModuleDataHandlers } from "@core/registry/types";

type WithId = { id: string };

function matchesSearchText<T extends object>(record: T, searchText: string): boolean {
    const query = searchText.trim().toLowerCase();
    if (!query) return true;
    return Object.values(record).some(
        (value) => typeof value === "string" && value.toLowerCase().includes(query),
    );
}

function matchesFilters<T extends object>(record: T, filters: Record<string, unknown> | undefined): boolean {
    if (!filters) return true;
    return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === "") return true;
        return (record as Record<string, unknown>)[key] === value;
    });
}

function compare(a: unknown, b: unknown): number {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b), "pt-BR");
}

export function createJsonDataHandlers<T extends WithId>(seed: T[]): RecordModuleDataHandlers<T> {
    const records: T[] = [...seed];

    async function search(args: SearchArgs): Promise<SearchResult<T>> {
        let filtered = records.filter(
            (record) => matchesSearchText(record, args.searchText ?? "") && matchesFilters(record, args.filters),
        );

        // Múltiplas chaves: ordena da menos pra mais prioritária — Array.sort
        // é estável, então a última passada (a primeira de `args.sort`) decide
        // por último e vence os empates das passadas anteriores.
        for (const { field, direction } of [...(args.sort ?? [])].reverse()) {
            const sorted = [...filtered].sort((a, b) => {
                const result = compare(
                    (a as Record<string, unknown>)[field],
                    (b as Record<string, unknown>)[field],
                );
                return direction === "desc" ? -result : result;
            });
            filtered = sorted;
        }

        const pageIndex = args.pagination?.pageIndex ?? 0;
        const pageSize = args.pagination?.pageSize ?? 20;
        const total = filtered.length;
        const start = pageIndex * pageSize;
        const data = filtered.slice(start, start + pageSize);

        return {
            data,
            pagination: {
                total,
                page: pageIndex + 1,
                limit: pageSize,
                pages: Math.max(1, Math.ceil(total / pageSize)),
            },
        };
    }

    async function read(id: string): Promise<T> {
        const record = records.find((item) => item.id === id);
        if (!record) throw new Error(`Registro "${id}" não encontrado.`);
        return record;
    }

    async function create(payload: unknown): Promise<T> {
        const record = { ...(payload as object), id: globalThis.crypto.randomUUID() } as T;
        records.push(record);
        return record;
    }

    async function update(id: string, payload: unknown): Promise<T> {
        const index = records.findIndex((item) => item.id === id);
        if (index === -1) throw new Error(`Registro "${id}" não encontrado.`);
        const updated = { ...records[index], ...(payload as object) } as T;
        records[index] = updated;
        return updated;
    }

    async function remove(id: string): Promise<void> {
        const index = records.findIndex((item) => item.id === id);
        if (index === -1) throw new Error(`Registro "${id}" não encontrado.`);
        records.splice(index, 1);
    }

    return { search, read, create, update, delete: remove };
}
