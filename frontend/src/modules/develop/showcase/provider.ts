// modules/develop/showcase/provider.ts
//
// Fixture 100% em memória — sem backend, sem fetch. Existe só pra validar o layout da
// detail page (docs/ui/detail-page.md §8) contra a referência visual, fora do caminho
// real de dados dos módulos de domínio.
import type { SearchArgs, SearchResult } from "@core/data-provider/types";
import type { ShowcaseEntity } from "./types";

const RECORDS: ShowcaseEntity[] = [
    {
        id: "showcase-1",
        name: "Ana Beatriz Lima",
        role: "Coordenadora de Projetos",
        status: "active",
        email: "ana.lima@exemplo.com",
        phone: "(11) 98888-7766",
        city: "São Paulo/SP",
        document: "123.456.789-00",
        birthDate: "14/03/2009 (16 anos)",
        maritalStatus: "Solteira",
        nationality: "Brasileira",
        department: "Projetos Sociais",
        notes:
            "Participante ativa do projeto de reforço escolar. Demonstra interesse em tecnologia e música. Já participou de 12 atendimentos.",
        tags: ["Reforço Escolar", "Tecnologia", "Música", "Família Unida"],
        createdAt: "2025-03-12T10:24:00.000Z",
    },
    {
        id: "showcase-2",
        name: "Carlos Eduardo Lima",
        role: "Voluntário",
        status: "active",
        email: "carlos.lima@exemplo.com",
        phone: "(11) 97777-6655",
        city: "São Paulo/SP",
        document: "987.654.321-00",
        birthDate: "22/07/1980 (45 anos)",
        maritalStatus: "Casado",
        nationality: "Brasileiro",
        department: "Projetos Sociais",
        notes: "Pai da Ana Beatriz — acompanha os atendimentos mensalmente.",
        tags: ["Família Unida"],
        createdAt: "2025-03-12T10:24:00.000Z",
    },
];

// Link de "Familiares" (docs/ui/detail-page.md §3/§9) — cada pessoa aponta pra outra via
// id real de RECORDS, pra validar a navegação Pessoa 1 → Pessoa 2 de verdade. `href` já
// vem resolvido (string, não função) porque ShowcaseRelationTable é client e esses dados
// atravessam a fronteira a partir de contract.tsx (Server Component).
export const FAMILY_MEMBERS: Record<string, { nome: string; parentesco: string; href: string }[]> = {
    "showcase-1": [{ nome: "Carlos Eduardo Lima", parentesco: "Pai", href: "/develop/detail-showcase/showcase-2" }],
    "showcase-2": [{ nome: "Ana Beatriz Lima", parentesco: "Filha", href: "/develop/detail-showcase/showcase-1" }],
};

export async function searchShowcase(_args: SearchArgs): Promise<SearchResult<ShowcaseEntity>> {
    return {
        data: RECORDS,
        pagination: { total: RECORDS.length, page: 1, limit: 20, pages: 1 },
    };
}

export async function readShowcase(id: string): Promise<ShowcaseEntity> {
    return RECORDS.find((record) => record.id === id) ?? RECORDS[0];
}

// Criação pelo Detail (etapa 2.6 do Plano Base.md) — mesmo padrão em memória
// de search/read, só pra validar o DraftProvider com 2+ seções (feedbacks,
// o único módulo real com createMode: "detail", tem só 1 seção).
export async function createShowcase(payload: unknown): Promise<ShowcaseEntity> {
    const data = (payload ?? {}) as Partial<ShowcaseEntity>;
    const record: ShowcaseEntity = {
        id: `showcase-${RECORDS.length + 1}`,
        name: data.name ?? "",
        role: data.role ?? "",
        status: "active",
        email: data.email ?? "",
        phone: data.phone ?? "",
        city: data.city ?? "",
        document: data.document ?? "",
        birthDate: data.birthDate ?? "",
        maritalStatus: data.maritalStatus ?? "",
        nationality: data.nationality ?? "",
        department: data.department ?? "",
        notes: data.notes ?? "",
        tags: [],
        createdAt: new Date().toISOString(),
    };
    RECORDS.push(record);
    return record;
}
