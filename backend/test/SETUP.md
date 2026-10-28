# Testes do backend — Alicerce

Três camadas, cada uma cobrindo o que a anterior não vê.

## 1. Unitários (`src/**/*.spec.ts`)

Co-locados com o código (`xxx.service.spec.ts`, `xxx.controller.spec.ts`),
`PrismaService` sempre mockado (`jest.fn()` por método usado).

```bash
npm run test        # roda tudo
npm run test:watch  # modo watch
npm run test:cov    # com cobertura
```

Padrão: ver `src/modules/feedbacks/` como módulo de referência (ADR —
AGENTS.md §5). `findOneOrThrow`, `resolvePagination` e
`tenant-search.util.ts` são os utilitários compartilhados que todo
service de módulo usa — não reinvente.

## 2. E2E com Prisma mockado (`test/*.e2e-spec.ts`)

Sobe um `TestingModule` real (Nest DI, guards, interceptors) mas com
`PrismaService` substituído por um mock em memória — rápido, mas não
passa por RLS, transação ou Postgres de verdade (isso já mascarou bugs
reais no passado — ver `docs/historico/`).

```bash
npm run test:e2e
```

`TestingModule.createNestApplication()` sem adapter explícito usa Express
como platform default do Nest (por isso `@nestjs/platform-express`
continua como dependência, mesmo a app real rodando só Fastify).

## 3. E2E contra Postgres + Redis reais (`test-db/*.db-spec.ts`)

A rede que pega o que o mock não vê: RLS, transação, cache de
permissões, throttle, lockout por conta. Sobe o `AppModule` inteiro via
`configureApp` (mesma função que `main.ts` usa).

```bash
npm run test:e2e:db
```

Precisa de `DATABASE_URL`/`APP_DATABASE_URL` configurados (`.env`) e
Postgres+Redis acessíveis — `globalSetup` roda `prisma migrate reset
--force` contra o banco de teste (`alicerce_test`, nunca o de dev) e
sincroniza o catálogo de permissões antes de cada execução.

## Convenções gerais

- Aliases: `@core/*` → `src/core/*`, `@modules/*` → `src/modules/*`,
  `@src/*` → `src/*`.
- `ParseUUIDPipe` em todo `:id` de rota — ver AGENTS.md §4.2 e
  `scripts/new-module.mjs` (o gerador já cobre isso).
- `jest.clearAllMocks()` em todo `beforeEach`.
- Teste o comportamento (o que a API retorna/grava), não a implementação
  interna.
- Antes de commitar: `npx tsc --noEmit && npm run lint && npm test`
  (checkpoint rápido) — o checkpoint completo (com os dois e2e) roda por
  commit em tarefas que tocam `core/`, auth ou RLS (ver CLAUDE.md).

## Módulo de referência

`feedback` (AGENTS.md §5) é o exemplo canônico — módulo com campo de
status, Feature filha (`FeedbackComment`,
`src/modules/feedbacks/features/comments/`) e permissão especial
(`feedback.manage`). Use-o como modelo ao criar algo novo; o passo a
passo completo está em `docs/guia-novo-modulo.md`.
