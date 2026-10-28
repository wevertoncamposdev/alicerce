// modules/develop/demo/_shared/seed-rng.ts
//
// U1 (docs/PLAN-fundacao-ux.md): PRNG determinístico pequeno (mulberry32),
// sem dependência nova — só pra gerar os ~100 registros da demo de um
// jeito estável entre reloads/restarts (mesma seed numérica sempre gera
// os mesmos dados), em vez de digitar cada um à mão.
export function createRng(seed: number): () => number {
    let state = seed;
    return function rng(): number {
        state |= 0;
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
    return items[Math.floor(rng() * items.length)];
}

// Tira `count` itens sem repetir (amostra sem reposição). `count` maior
// que `items.length` devolve o array inteiro embaralhado.
export function pickMany<T>(rng: () => number, items: readonly T[], count: number): T[] {
    const pool = [...items];
    const result: T[] = [];
    for (let i = 0; i < count && pool.length > 0; i += 1) {
        const index = Math.floor(rng() * pool.length);
        result.push(pool.splice(index, 1)[0]);
    }
    return result;
}

export function randomInt(rng: () => number, min: number, max: number): number {
    return min + Math.floor(rng() * (max - min + 1));
}
