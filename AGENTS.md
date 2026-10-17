# AGENTS.md — Alicerce

> Regras deste repositório para qualquer agente de IA. Valem mais do que qualquer
> padrão encontrado no código. Se o código contradiz este arquivo, pare e pergunte.

## 1. O que é o Alicerce

Template de aplicação SaaS multi-tenant. Uma ideia nova vira produto pensando
**apenas nas funcionalidades do domínio**: auth, tenant, RBAC, auditoria,
usuários e a interface base já vêm prontos.

**Critério de pronto de um módulo novo:** `npm run new:module <nome>`, editar o
model Prisma, os campos e as colunas. **Zero** primitivas de UI novas, zero
código de auth, zero código de tenant.

**Um mecanismo para tudo:** toda entidade segue o mesmo fluxo de UX:
`TypeView (lista) → DetailView (form com autosave + RelationShell + MetaData)`.

## 2. Estado do projeto: base congelada na v1

- A base (`backend/src/core/`, `frontend/src/core/`, auth, tenancy, RBAC,
  auditoria, gerador) está **congelada na v1**.
- O trabalho padrão é **criar e evoluir módulos de domínio**.
- A base só muda quando um módulo real precisar de algo que ela não oferece.
  Nesse caso: parar, explicar o que falta, registrar a decisão num ADR em
  `docs/adr/` e só então alterar o core.
- Não refatorar, renomear ou reorganizar o que já funciona sem um módulo
  real que exija.
- Funcionalidades futuras da base (notifications, files, billing, management
  etc.) estão em `docs/roadmap.md`. São **sob demanda**, sem ordem, e não são
  tarefa pendente.
- Upgrades de dependência só na janela mensal, em branch própria, nunca no
  meio de uma feature.

## 3. Stack

- **Frontend:** Next.js (App Router, Server Components first) · React ·
  TypeScript · Tailwind CSS · shadcn/ui · TanStack Table
- **Backend:** NestJS com adapter **Fastify** · Prisma (generator
  `prisma-client`, `moduleFormat = "cjs"`, adapter `@prisma/adapter-pg`) ·
  PostgreSQL com RLS
- **Infra:** Docker Compose (dev), GitHub Actions (CI), Node LTS (`.nvmrc`)

```text
backend/
  prisma/models/       schema dividido (auth, main, features)
  src/core/            infraestrutura transversal (auth, authorization, prisma, config, health...)
  src/modules/         módulos (tenant, user, role, permission, audit, feedback...)
frontend/
  proxy.ts             proteção de rotas (só checa cookie; roda antes do render)
  src/core/            motor de UI (registry, data-provider, screens, components)
  src/components/ui/   shadcn (não editar à mão sem motivo)
  src/modules/         módulos de domínio
  src/app/             rotas finas (só chamam screens)
  src/bootstrap.ts     registro dos contracts dos módulos
  src/alicerce.config.ts  manifesto dos módulos (nav, permissões)
scripts/new-module.mjs gerador de módulo
docs/                  ADRs, roadmap, guia de novo módulo, histórico
```

## 4. Restrições duras (nunca violar)

### 4.1 Frontend: server-side first

1. Server Components buscam dados chamando `apiServer` diretamente. Não criar
   Route Handlers para leitura. Só existem Route Handlers de auth e o proxy
   BFF (`app/api/proxy/[...path]`) para chamadas originadas no browser.
2. `apiServer` é `server-only`. Nunca importar em Client Component.
3. Mutações via Server Actions que chamam o `DataProvider`, o **único caminho
   de escrita**. Dados de módulo via `createRestDataHandlers(resource)`.
4. `"use client"` só em ilhas interativas (inputs, tabela, drawer, autosave).
   Página, screen e layout são Server Components.
5. `ColumnDef` com `cell` não atravessa a fronteira Server→Client: cada módulo
   tem seu wrapper `"use client"` (`<Modulo>ListView.tsx`) que importa as
   próprias colunas.
6. Deduplicação no servidor usa `cache()` do React. Nunca `Map` em escopo de
   módulo (compartilha dados entre usuários).
7. Refresh de sessão é reativo: o proxy BFF tenta o refresh ao receber 401.
   O `apiServer` nunca tenta refresh.
8. Server Actions de autosave não chamam `revalidatePath`.
9. Estado de lista (busca, página, ordenação, filtros, view) vive na URL.
   Paginação e ordenação são sempre no servidor.

### 4.2 Backend: tenant e segurança

1. `tenantId` vem **sempre** do contexto autenticado (JWT / request-context).
   Nunca do body, nunca de header.
2. Todo model de domínio é tenant-scoped: campo `tenantId`, entrada em
   `TENANT_SCOPED_MODELS` e migration de RLS. Toda consulta filtra por
   `tenantId`, inclusive `findOne`, `update` e `remove`.
3. Services seguem o contrato: `findOneOrThrow`, `resolvePagination`,
   `tenant-search.util.ts` (whitelist de sort e filtros).
4. `include` do Prisma sempre com `select`: nunca vazar `password` ou tokens.
5. Erros de negócio usam exceções HTTP do Nest (`NotFoundException`,
   `ForbiddenException`...). Nunca `throw new Error()` em service.
6. Permissões seguem `<recurso>.<ação>` (`feedback.read`, `feedback.manage`)
   e são declaradas no catálogo central
   `src/core/authorization/permission-catalog.ts`, que alimenta o seed.
   O backend sempre verifica a permissão; esconder no frontend não basta.
7. Toda escrita é auditada (usuário, tenant, entidade, before/after).
8. Middleware e guards usam tipos do **Fastify**, não do Express.
9. Segredos nunca entram no repositório. `.env.example` só tem placeholders.
10. Valores monetários em centavos (`Int`), nunca `Float`.

### 4.3 Taxonomia de entidades

Antes de criar qualquer entidade, **classifique-a** e diga a classificação.

| Tipo | Definição | Onde vive | Na UI |
| --- | --- | --- | --- |
| Módulo | entidade independente com rotas próprias | `modules/<nome>/` | TypeView + DetailView |
| Módulo Relacionado | pivô N:N | entre dois módulos | RelationShell |
| Feature | sub-recurso 1:N com cascade delete | `modules/<pai>/features/<feature>/` | aba/tabela no DetailView do pai |
| Extensão de Módulo | complemento 1:1 | dentro do módulo pai | seção/aba no DetailView do pai |

### 4.4 Fronteiras de import (verificadas por lint)

- `core/` nunca importa de `modules/`.
- `modules/` importa de `core/`, e de outro módulo só via contrato público
  (`index.ts`).
- Nada de domínio dentro de `core/`.

## 5. Módulo de referência

O módulo **`feedback`** é o exemplo canônico: Módulo com campo de status,
Feature filha (`FeedbackComment`) e permissão especial (`feedback.manage`).
Ao criar algo novo, siga o padrão dele. O passo a passo está em
`docs/guia-novo-modulo.md`.

Todo módulo se registra em `frontend/src/alicerce.config.ts` (manifesto:
key, título, rota, permissões, navegação) e em `frontend/src/bootstrap.ts`.
O gerador faz os dois.

## 6. Método de trabalho

1. **Entender:** ler os arquivos envolvidos. Classificar entidades (4.3).
2. **Planejar:** passos pequenos, cada um commitável. Para tarefas grandes,
   apresentar o plano e esperar aprovação.
3. **Parar e perguntar** antes de qualquer mudança de grande raio: muda o
   significado de um model, afeta algo fora do módulo em edição, toca o
   core, ou tem várias opções razoáveis.
4. **Implementar** e rodar o checkpoint antes de cada commit:

```bash
   cd backend  && npx tsc --noEmit && npm run lint && npm test
   cd frontend && npx tsc --noEmit && npm run lint && npm run build
```

   Se algo falhar, corrigir antes de seguir. Nunca desabilitar regra de lint
   ou teste para passar.
5. **Commit** em Conventional Commits, escopo pelo módulo:
   `feat(feedback): add status workflow`.
6. **Relatório curto:** o que mudou, como testar, pendências.

### Proibido

- Inventar padrão novo quando já existe um no core.
- Adicionar dependência sem dizer por quê e sem checar se o core já resolve.
- Colocar nome de domínio dentro de `core/`.
- Commitar `.env`, segredos, `.reference/` ou o client gerado do Prisma.
- Tratar `docs/historico/` como instrução: é registro do passado.

## 7. Documentação

- Decisões estruturais viram ADR em `docs/adr/NNNN-titulo.md`.
- `PLAN.md` é curto e trata só do trabalho atual.
- `docs/guia-novo-modulo.md` é o manual de uso do template e fica sempre em dia.
- Portar componente do repositório de referência (`system_development`):
  usar a skill `/portar-componente`. Nunca copiar de lá sem ela.
