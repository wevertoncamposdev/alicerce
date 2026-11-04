import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { buildColumns, formatColumnText } from "@core/components/Layout/column-builder";
import { defineEnum } from "@core/registry/enum";
import type { ColumnConfig } from "@core/registry/types";

type Row = {
    id: string;
    nome: string;
    cidade: string;
    status: string;
    nascimento: string;
    criadoEm: string;
    saldo: number;
    tags: string[];
    total: number;
    tenantNome: string;
};

const StatusEnum = defineEnum("Status", {
    ATIVO: { label: "Ativo", tone: "success" },
    INATIVO: { label: "Inativo", tone: "neutral" },
});

// Intl.NumberFormat("pt-BR", {style:"currency"}) pode inserir um espaço
// NBSP (U+00A0) entre "R$" e o número, dependendo da versão do Node/ICU
// — visualmente idêntico a um espaço comum, mas `!==` byte a byte.
// Monta o esperado com o mesmo formatter em vez de hardcodar a string.
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const row: Row = {
    id: "r1",
    nome: "Maria Souza",
    cidade: "Recife/PE",
    status: "ATIVO",
    nascimento: "2000-05-10",
    criadoEm: "2026-01-02T15:30:00.000Z",
    saldo: 123456,
    tags: ["voluntária", "coral"],
    total: 7,
    tenantNome: "Instituição Exemplo",
};

// Cada `cell` do ColumnDef só usa `row.original` — chamar direto com um
// contexto mínimo evita montar uma `useTable` inteira só pro teste.
function renderCell<T extends object>(columns: ColumnConfig<T>[], index: number, record: T) {
    const [columnDef] = buildColumns([columns[index]]);
    const cell = columnDef.cell as unknown as (ctx: { row: { original: T } }) => React.ReactNode;
    return render(<>{cell({ row: { original: record } })}</>);
}

describe("formatColumnText", () => {
    it("formata cada tipo em texto puro", () => {
        expect(formatColumnText<Row>({ key: "cidade", label: "Cidade", type: "text" }, row)).toBe("Recife/PE");
        expect(formatColumnText<Row>({ key: "nascimento", label: "Nascimento", type: "date" }, row)).toBe(
            new Date(row.nascimento).toLocaleDateString("pt-BR"),
        );
        expect(formatColumnText<Row>({ key: "criadoEm", label: "Criado em", type: "datetime" }, row)).toBe(
            new Date(row.criadoEm).toLocaleString("pt-BR"),
        );
        expect(formatColumnText<Row>({ key: "saldo", label: "Saldo", type: "money" }, row)).toBe(money.format(1234.56));
        expect(formatColumnText<Row>({ key: "status", label: "Status", type: "badge", enumDef: StatusEnum }, row)).toBe(
            "Ativo",
        );
        expect(formatColumnText<Row>({ key: "tags", label: "Tags", type: "tags" }, row)).toBe("voluntária, coral");
        expect(formatColumnText<Row>({ key: "total", label: "Total", type: "count" }, row)).toBe("7");
    });

    it("valor vazio/ausente vira string vazia, nunca quebra", () => {
        const empty: Row = { ...row, cidade: "" };
        expect(formatColumnText<Row>({ key: "cidade", label: "Cidade", type: "text" }, empty)).toBe("");
    });
});

describe("buildColumns", () => {
    it("text: mostra o valor cru, ou travessão quando vazio", () => {
        const columns: ColumnConfig<Row>[] = [{ key: "cidade", label: "Cidade", type: "text" }];
        renderCell(columns, 0, row);
        expect(screen.getByText("Recife/PE")).toBeInTheDocument();

        renderCell(columns, 0, { ...row, cidade: "" });
        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("badge: renderiza EnumBadge com o label certo", () => {
        const columns: ColumnConfig<Row>[] = [{ key: "status", label: "Status", type: "badge", enumDef: StatusEnum }];
        renderCell(columns, 0, row);
        expect(screen.getByText("Ativo")).toBeInTheDocument();
    });

    it("title: link pro registro, avatar e nome", () => {
        const columns: ColumnConfig<Row>[] = [
            {
                key: "nome",
                label: "Nome",
                type: "title",
                href: (r) => `/pessoas/${r.id}`,
                avatar: { fallback: (r) => r.nome.slice(0, 2).toUpperCase() },
                subtitle: "cidade",
            },
        ];
        renderCell(columns, 0, row);
        const link = screen.getByRole("link", { name: /Maria Souza/ });
        expect(link).toHaveAttribute("href", "/pessoas/r1");
        expect(screen.getByText("Recife/PE")).toBeInTheDocument();
    });

    it("relation: sem href vira texto simples, não link", () => {
        const columns: ColumnConfig<Row>[] = [
            { key: "tenantNome", label: "Instituição", type: "relation", href: () => null },
        ];
        renderCell(columns, 0, row);
        expect(screen.getByText("Instituição Exemplo")).toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("tags: um chip por tag, travessão quando vazio", () => {
        const columns: ColumnConfig<Row>[] = [{ key: "tags", label: "Tags", type: "tags" }];
        renderCell(columns, 0, row);
        expect(screen.getByText("voluntária")).toBeInTheDocument();
        expect(screen.getByText("coral")).toBeInTheDocument();

        renderCell(columns, 0, { ...row, tags: [] });
        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("count: mostra o número dentro de um badge", () => {
        const columns: ColumnConfig<Row>[] = [{ key: "total", label: "Total", type: "count" }];
        renderCell(columns, 0, row);
        expect(screen.getByText("7")).toBeInTheDocument();
    });

    it("money: formata em reais", () => {
        // Substring, não igualdade exata: Intl.NumberFormat pode usar NBSP
        // (U+00A0) entre "R$" e o número — a normalização de espaço do
        // testing-library na busca por texto não garante bater com o NBSP
        // literal que acabou no DOM.
        const columns: ColumnConfig<Row>[] = [{ key: "saldo", label: "Saldo", type: "money" }];
        renderCell(columns, 0, row);
        expect(screen.getByText((text) => text.includes("1.234,56"))).toBeInTheDocument();
    });
});
