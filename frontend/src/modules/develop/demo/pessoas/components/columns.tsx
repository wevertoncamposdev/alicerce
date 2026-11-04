import type { ColumnConfig } from "@core/registry/types";
import { PessoaStatusEnum } from "@modules/develop/demo/_shared/enums";
import type { Pessoa } from "../types/types";

function initials(nome: string): string {
    return nome
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

// U3 (docs/PLAN-fundacao-ux.md): prova do ColumnConfig novo (core/
// registry/types.ts + column-builder.tsx) — 8 colunas, critério de
// aceite da etapa ("lista de Pessoas da demo com 8+ colunas
// legível"). `nascimento` fica `type: "text"` de propósito: já nasce
// formatado "DD/MM/AAAA" (seed-data.ts, `pastDate()`), não ISO — virar
// `type: "date"` quebraria (`new Date("20/07/1963")` é inválido).
// `createdAt` é ISO de verdade, prova o tipo "date".
export const pessoaColumns: ColumnConfig<Pessoa>[] = [
    {
        key: "nome",
        label: "Nome",
        type: "title",
        href: (record) => `/develop/demo/pessoas/${record.id}`,
        avatar: { fallback: (record) => initials(record.nome) },
    },
    { key: "status", label: "Status", type: "badge", enumDef: PessoaStatusEnum },
    { key: "cidade", label: "Cidade", type: "text" },
    { key: "telefone", label: "Telefone", type: "text" },
    { key: "email", label: "E-mail", type: "text" },
    { key: "cpf", label: "CPF", type: "text" },
    { key: "tags", label: "Tags", type: "tags" },
    { key: "createdAt", label: "Criado em", type: "date" },
];
