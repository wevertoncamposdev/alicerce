// modules/develop/demo/_shared/seed-data.ts
//
// U1 (docs/PLAN-fundacao-ux.md): os quatro conjuntos de dados fictícios
// da demo, gerados uma vez (seed numérica fixa — mesmos dados sempre),
// consumidos pelos três módulos via `createJsonDataHandlers`. Nomes de
// domínio ficam só aqui, nunca em core/ (§3 do plano).
import { createRng, pick, pickMany, randomInt } from "./seed-rng";
import type { Atendimento, Atividade, Pessoa, Vinculo } from "./types";

const FIRST_NAMES_F = [
    "Ana", "Beatriz", "Carla", "Daniela", "Eduarda", "Fernanda", "Gabriela",
    "Helena", "Isabela", "Juliana", "Larissa", "Mariana", "Natália",
    "Patrícia", "Rafaela", "Sofia", "Tatiane", "Valentina", "Vitória", "Yasmin",
];
const FIRST_NAMES_M = [
    "André", "Bruno", "Carlos", "Daniel", "Eduardo", "Felipe", "Gabriel",
    "Henrique", "Igor", "João", "Lucas", "Marcos", "Nelson", "Paulo",
    "Rafael", "Sérgio", "Thiago", "Vinícius", "William", "Yuri",
];
const LAST_NAMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Pereira",
    "Almeida", "Ferreira", "Rodrigues", "Carvalho", "Gomes", "Martins",
    "Araújo", "Barbosa", "Ribeiro", "Cardoso", "Teixeira", "Moreira", "Castro",
];
const CITIES = [
    "São Paulo/SP", "Rio de Janeiro/RJ", "Belo Horizonte/MG", "Curitiba/PR",
    "Salvador/BA", "Recife/PE", "Porto Alegre/RS", "Fortaleza/CE",
];
const PESSOA_TAGS = [
    "Reforço Escolar", "Tecnologia", "Música", "Esportes", "Artesanato",
    "Família Unida", "Teatro", "Voluntariado",
];

// Faixa Unicode dos sinais diacríticos combinantes, depois de
// `normalize("NFD")" separar a letra base do acento. Construído via
// `String.fromCharCode` (não `\uXXXX` dentro da regex) pra não depender
// de nenhum escape de string — mesmo problema e mesmo fix de
// `backend/src/core/common/transformers/uf.ts`.
const COMBINING_DIACRITICS = new RegExp(
    `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
    "g",
);

function slugifyName(nome: string): string {
    return nome
        .toLowerCase()
        .normalize("NFD")
        .replace(COMBINING_DIACRITICS, "")
        .replace(/\s+/g, ".");
}

function cpf(rng: () => number): string {
    const d = () => randomInt(rng, 0, 9);
    return `${d()}${d()}${d()}.${d()}${d()}${d()}.${d()}${d()}${d()}-${d()}${d()}`;
}

function phone(rng: () => number): string {
    return `(${randomInt(rng, 11, 21)}) 9${randomInt(rng, 1000, 9999)}-${randomInt(rng, 1000, 9999)}`;
}

function pastDate(rng: () => number, minYear: number, maxYear: number): string {
    const year = randomInt(rng, minYear, maxYear);
    const month = randomInt(rng, 1, 12);
    const day = randomInt(rng, 1, 28);
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

const rng = createRng(20261028);

function buildPessoas(count: number): Pessoa[] {
    return Array.from({ length: count }, (_, index) => {
        const isFeminine = rng() < 0.5;
        const nome = `${pick(rng, isFeminine ? FIRST_NAMES_F : FIRST_NAMES_M)} ${pick(rng, LAST_NAMES)} ${pick(rng, LAST_NAMES)}`;
        return {
            id: `pessoa-${index + 1}`,
            nome,
            nascimento: pastDate(rng, 1950, 2015),
            cpf: cpf(rng),
            telefone: phone(rng),
            email: `${slugifyName(nome)}@exemplo.com`,
            cidade: pick(rng, CITIES),
            status: rng() < 0.85 ? "ATIVO" : "INATIVO",
            tags: pickMany(rng, PESSOA_TAGS, randomInt(rng, 0, 3)),
            observacoes: "",
            createdAt: new Date(2025, randomInt(rng, 0, 11), randomInt(rng, 1, 28)).toISOString(),
        };
    });
}

const ATIVIDADE_SEEDS: Array<{ nome: string; categoria: string; diaHorario: string }> = [
    { nome: "Música", categoria: "Cultura", diaHorario: "Terças, 14h" },
    { nome: "Capoeira", categoria: "Esporte", diaHorario: "Quartas, 15h30" },
    { nome: "Reforço Escolar", categoria: "Educação", diaHorario: "Seg. a qui., 13h" },
    { nome: "Artesanato", categoria: "Cultura", diaHorario: "Quintas, 10h" },
    { nome: "Teatro", categoria: "Cultura", diaHorario: "Sextas, 16h" },
    { nome: "Informática", categoria: "Educação", diaHorario: "Sábados, 9h" },
    { nome: "Dança", categoria: "Cultura", diaHorario: "Quartas, 17h" },
    { nome: "Esportes Coletivos", categoria: "Esporte", diaHorario: "Sábados, 10h" },
];

function buildAtividades(): Atividade[] {
    return ATIVIDADE_SEEDS.map((base, index) => ({
        id: `atividade-${index + 1}`,
        nome: base.nome,
        categoria: base.categoria,
        diaHorario: base.diaHorario,
        responsavel: `${pick(rng, FIRST_NAMES_F.concat(FIRST_NAMES_M))} ${pick(rng, LAST_NAMES)}`,
        status: rng() < 0.9 ? "ATIVA" : "INATIVA",
        descricao: `Atividade de ${base.categoria.toLowerCase()} oferecida à comunidade.`,
        createdAt: new Date(2025, 0, 1).toISOString(),
    }));
}

const VINCULO_TIPOS = ["Participante", "Voluntário", "Responsável"];

function buildVinculos(pessoas: Pessoa[], atividades: Atividade[]): Vinculo[] {
    const vinculos: Vinculo[] = [];
    for (const pessoa of pessoas) {
        const linked = pickMany(rng, atividades, randomInt(rng, 0, 2));
        for (const atividade of linked) {
            const inicio = pastDate(rng, 2023, 2025);
            const comEncerramento = rng() < 0.3;
            vinculos.push({
                pessoaId: pessoa.id,
                atividadeId: atividade.id,
                tipo: pick(rng, VINCULO_TIPOS),
                periodoInicio: inicio,
                periodoFim: comEncerramento ? pastDate(rng, 2025, 2026) : null,
            });
        }
    }
    return vinculos;
}

const ATENDIMENTO_PROFISSIONAIS = [
    "Dra. Camila Reis", "Dr. Marcelo Nunes", "Dra. Beatriz Monteiro", "Dr. Rodrigo Pires",
];

function buildAtendimentos(pessoas: Pessoa[], count: number): Atendimento[] {
    return Array.from({ length: count }, (_, index) => {
        const pessoa = pick(rng, pessoas);
        const sigiloso = rng() < 0.25;
        return {
            id: `atendimento-${index + 1}`,
            pessoaId: pessoa.id,
            data: pastDate(rng, 2025, 2026),
            tipo: rng() < 0.5 ? "SOCIAL" : "PSICOLOGICO",
            profissional: pick(rng, ATENDIMENTO_PROFISSIONAIS),
            situacao: pick(rng, ["AGENDADO", "REALIZADO", "CANCELADO"] as const),
            sigiloso,
            observacoes: sigiloso ? "" : "Atendimento de rotina, sem pendências.",
            createdAt: new Date(2025, randomInt(rng, 0, 11), randomInt(rng, 1, 28)).toISOString(),
        };
    });
}

export const PESSOAS: Pessoa[] = buildPessoas(40);
export const ATIVIDADES: Atividade[] = buildAtividades();
export const VINCULOS: Vinculo[] = buildVinculos(PESSOAS, ATIVIDADES);
export const ATENDIMENTOS: Atendimento[] = buildAtendimentos(PESSOAS, 60);
