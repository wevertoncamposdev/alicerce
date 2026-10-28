// modules/develop/demo/_shared/types.ts
//
// U1 (docs/PLAN-fundacao-ux.md): tipos das três entidades fictícias da
// demo + o vínculo (pivot) entre Pessoa e Atividade. Ficam num lugar só
// pra `seed-data.ts` gerar os quatro conjuntos juntos (Atendimento
// referencia `pessoaId`, Vínculo referencia `pessoaId`+`atividadeId`).
// Cada módulo reexporta só o tipo que é dele em `types/types.ts`
// (mesma convenção de um `types/types.ts` por módulo).

export type PessoaStatus = "ATIVO" | "INATIVO";

export type Pessoa = {
    id: string;
    nome: string;
    nascimento: string;
    cpf: string;
    telefone: string;
    email: string;
    cidade: string;
    status: PessoaStatus;
    tags: string[];
    observacoes: string;
    createdAt: string;
};

export type AtividadeStatus = "ATIVA" | "INATIVA";

export type Atividade = {
    id: string;
    nome: string;
    categoria: string;
    diaHorario: string;
    responsavel: string;
    status: AtividadeStatus;
    descricao: string;
    createdAt: string;
};

export type AtendimentoTipo = "SOCIAL" | "PSICOLOGICO";
export type AtendimentoSituacao = "AGENDADO" | "REALIZADO" | "CANCELADO";

export type Atendimento = {
    id: string;
    pessoaId: string;
    data: string;
    tipo: AtendimentoTipo;
    profissional: string;
    situacao: AtendimentoSituacao;
    sigiloso: boolean;
    observacoes: string;
    createdAt: string;
};

// Vínculo Pessoa↔Atividade (tipo + período) — pivot simples em memória,
// sem mecanismo novo de relação no core/ (isso é U5). Só dados, exibidos
// via ShowcaseRelationTable nos dois lados.
export type Vinculo = {
    pessoaId: string;
    atividadeId: string;
    tipo: string;
    periodoInicio: string;
    periodoFim: string | null;
};
