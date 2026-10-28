import { describe, expect, it } from "vitest";
import { createJsonDataHandlers } from "./json";

type Pessoa = { id: string; nome: string; cidade: string; idade: number };

function seed(): Pessoa[] {
    return [
        { id: "1", nome: "Ana Lima", cidade: "São Paulo", idade: 30 },
        { id: "2", nome: "Bruno Costa", cidade: "Rio de Janeiro", idade: 25 },
        { id: "3", nome: "Carla Souza", cidade: "São Paulo", idade: 40 },
    ];
}

describe("createJsonDataHandlers", () => {
    describe("search", () => {
        it("sem filtros devolve tudo, paginado com o default", async () => {
            const handlers = createJsonDataHandlers(seed());
            const result = await handlers.search({});

            expect(result.data).toHaveLength(3);
            expect(result.pagination).toEqual({ total: 3, page: 1, limit: 20, pages: 1 });
        });

        it("searchText filtra por substring em qualquer campo string, sem diferenciar caixa", async () => {
            const handlers = createJsonDataHandlers(seed());
            const result = await handlers.search({ searchText: "rio de" });

            expect(result.data.map((p) => p.nome)).toEqual(["Bruno Costa"]);
        });

        it("filters aplica igualdade exata por campo", async () => {
            const handlers = createJsonDataHandlers(seed());
            const result = await handlers.search({ filters: { cidade: "São Paulo" } });

            expect(result.data.map((p) => p.nome).sort()).toEqual(["Ana Lima", "Carla Souza"]);
        });

        it("sort ordena por campo e direção", async () => {
            const handlers = createJsonDataHandlers(seed());
            const asc = await handlers.search({ sort: [{ field: "idade", direction: "asc" }] });
            const desc = await handlers.search({ sort: [{ field: "idade", direction: "desc" }] });

            expect(asc.data.map((p) => p.idade)).toEqual([25, 30, 40]);
            expect(desc.data.map((p) => p.idade)).toEqual([40, 30, 25]);
        });

        it("pagination corta e devolve metadados corretos", async () => {
            const handlers = createJsonDataHandlers(seed());
            const result = await handlers.search({ pagination: { pageIndex: 1, pageSize: 2 } });

            expect(result.data).toHaveLength(1);
            expect(result.pagination).toEqual({ total: 3, page: 2, limit: 2, pages: 2 });
        });
    });

    describe("read", () => {
        it("acha o registro pelo id", async () => {
            const handlers = createJsonDataHandlers(seed());
            const record = await handlers.read("2");
            expect(record.nome).toBe("Bruno Costa");
        });

        it("lança um erro claro quando o id não existe", async () => {
            const handlers = createJsonDataHandlers(seed());
            await expect(handlers.read("999")).rejects.toThrow(/não encontrado/);
        });
    });

    describe("create", () => {
        it("gera um id e adiciona ao conjunto, visível numa busca seguinte", async () => {
            const handlers = createJsonDataHandlers(seed());
            const created = await handlers.create!({ nome: "Diego Alves", cidade: "Curitiba", idade: 22 });

            expect(created.id).toBeTruthy();
            const result = await handlers.search({});
            expect(result.data.map((p) => p.nome)).toContain("Diego Alves");
        });
    });

    describe("update", () => {
        it("mescla o patch parcial no registro existente, sem apagar os outros campos", async () => {
            const handlers = createJsonDataHandlers(seed());
            const updated = await handlers.update!("1", { cidade: "Campinas" });

            expect(updated).toMatchObject({ id: "1", nome: "Ana Lima", cidade: "Campinas", idade: 30 });
        });

        it("aceita null pra limpar um campo (mesma regra do autosave real, D2)", async () => {
            const handlers = createJsonDataHandlers(seed());
            const updated = await handlers.update!("1", { cidade: null });

            expect(updated.cidade).toBeNull();
        });

        it("lança um erro claro quando o id não existe", async () => {
            const handlers = createJsonDataHandlers(seed());
            await expect(handlers.update!("999", { nome: "X" })).rejects.toThrow(/não encontrado/);
        });
    });

    describe("delete", () => {
        it("remove o registro, que some de uma busca seguinte", async () => {
            const handlers = createJsonDataHandlers(seed());
            await handlers.delete!("1");

            const result = await handlers.search({});
            expect(result.data.map((p) => p.id)).not.toContain("1");
        });

        it("lança um erro claro quando o id não existe", async () => {
            const handlers = createJsonDataHandlers(seed());
            await expect(handlers.delete!("999")).rejects.toThrow(/não encontrado/);
        });
    });

    it("duas chamadas de createJsonDataHandlers com o mesmo seed não compartilham estado entre si", async () => {
        const a = createJsonDataHandlers(seed());
        const b = createJsonDataHandlers(seed());

        await a.create!({ nome: "Só no A", cidade: "X", idade: 1 });

        const resultB = await b.search({});
        expect(resultB.data.map((p) => p.nome)).not.toContain("Só no A");
    });
});
