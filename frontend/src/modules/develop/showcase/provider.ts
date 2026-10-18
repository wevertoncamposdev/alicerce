// modules/develop/showcase/provider.ts
//
// Fixture 100% em memória — sem backend, sem fetch. Existe só pra validar o layout da
// detail page (docs/ui/detail-page.md §8) contra a referência visual, fora do caminho
// real de dados dos módulos de domínio.
import type { SearchArgs, SearchResult } from "@core/data-provider/types";
import type { ShowcaseEntity } from "./types";

const RECORD: ShowcaseEntity = {
    id: "showcase-1",
    name: "Ana Beatriz Lima",
    role: "Coordenadora de Projetos",
    status: "active",
    email: "ana.lima@exemplo.com",
    phone: "(11) 98888-7766",
    city: "São Paulo/SP",
    createdAt: "2025-03-12T10:24:00.000Z",
};

export async function searchShowcase(_args: SearchArgs): Promise<SearchResult<ShowcaseEntity>> {
    return {
        data: [RECORD],
        pagination: { total: 1, page: 1, limit: 20, pages: 1 },
    };
}

export async function readShowcase(_id: string): Promise<ShowcaseEntity> {
    return RECORD;
}
