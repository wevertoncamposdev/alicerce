# Frontend — Alicerce

Frontend em Next.js (App Router), arquitetura por **módulos** (`src/modules/`) com
composição de telas via um motor de UI comum (`TypeView` → `DetailView` com
`MetaData`/`RelationShell`). Veja o `AGENTS.md` na raiz do repositório para as regras
de arquitetura e o `PLAN.md` para o backlog corrente — este README cobre só o setup e
as convenções deste pacote.

> Guia completo de como criar um módulo novo: rota `/develop` da própria aplicação
> (`src/modules/develop/`) — é o documento vivo, mantido junto do código.

## Comandos

```bash
npm run dev     # servidor de desenvolvimento (porta 3000)
npm run build   # build de produção
npm run start   # roda o build de produção
npm run lint    # eslint
```

## Verificação

```bash
npx tsc --noEmit   # erros de tipo
npx knip           # arquivos/exports/dependências não usados
```

Build sem erro de tipagem é pré-condição para qualquer merge.

## Estrutura real

```bash
src/
├── app/
│   ├── (app)/      # rotas autenticadas — users, roles, permissions, tenants, audit, favorites, dashboard, develop
│   ├── (public)/   # auth/login, auth/register
│   └── api/        # Route Handlers: auth/* (BFF) e proxy/[...path] (reverse proxy autenticado)
├── components/
│   ├── TypeView/     # engine de listagem (ListView, CardsView, GraphView, FormView) + ViewSwitcher
│   ├── DetailView/   # engine de detalhe: MetaDataView (Contexto, Auditoria) + RelationView
│   ├── Layout/       # AppSidebar, AppTopbar, AutoSaveIndicator
│   └── ui/           # primitivas shadcn — não editar à mão sem motivo
├── lib/
│   ├── api-server.ts       # client HTTP server-only (cookies → Bearer + x-tenant-id)
│   ├── session.ts          # cookies de sessão (access/refresh/tenant)
│   ├── authz.ts            # regras de acesso por rota/ação
│   ├── registry/           # registro de módulos (defineRecordModule/registerModule)
│   └── data-provider/      # contrato SearchArgs/SearchResult/DataProvider
└── modules/          # um diretório por módulo de domínio (favorites, users, roles, permissions, tenants, audit)
```

Cada módulo de domínio segue o mesmo contrato — ver `src/modules/_template/README.md`
para o esqueleto e `/develop` para o passo a passo completo.

## Convenções de microcopy

- `loading`: verbo no gerúndio, por domínio (`Carregando usuários...`).
- `empty`: mensagem direta por domínio (`Nenhum usuário encontrado.`).
- `tenant ausente`: orientar ação em frase única (`Selecione um tenant...`).
- `erro de permissão`: iniciar com `Sem permissão` e descrever a ação.

## Testes

**Não há testes automatizados no frontend ainda** — nenhuma dependência de teste está
instalada neste pacote. A estratégia mínima (fluxos de auth, isolamento de tenant,
guards de RBAC) está no backlog como item do `PLAN.md` (bloco de infraestrutura); o
backend já segue um padrão de teste (`backend/test/TEST_PATTERN.md`) que serve de
referência de estilo quando isso for implementado aqui.

Até lá, a validação de PR é manual:

1. `npm run build` sem erro de tipagem.
2. Smoke visual nas rotas afetadas, desktop e mobile — ver checklist abaixo.

### Checklist de smoke visual

Nas rotas afetadas pela mudança (`/users`, `/roles`, `/permissions`, `/tenants`,
`/favorites`, `/audit`, `/dashboard`):

1. Header e shells com espaçamento/contraste consistente, claro e escuro.
2. Estados de carregamento/vazio renderizando a mensagem esperada.
3. Ações bloqueadas corretamente sem permissão ou sem tenant.
4. Tabelas sem corte visual, com overflow horizontal funcional.
5. Sem regressão de CRUD básico e de vínculos (Role↔User, Role↔Permission).
