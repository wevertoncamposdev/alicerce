# Página de lista (TypeView) — estado atual

> Baseline do que o motor de lista faz hoje, validado pela demo em JSON
> (`modules/develop/demo/**`, U1 — `docs/PLAN-fundacao-ux.md`). Documenta
> o que existe, não um mecanismo novo: serve de ponto de partida pra U3
> evoluir a lista.

## 1. Onde estamos (código real)

| Peça | Arquivo | Situação |
| --- | --- | --- |
| Screen | `core/screens/TypeViewScreen.tsx` | Resolve módulo, parseia estado da URL, chama `dataProvider.search`, monta topbar (busca + "Novo" + `ViewSwitcher`). Mantém. |
| Motor | `components/TypeView/TypeView.tsx` | Despacha pro layout de lista do módulo (`listLayout.list`), conforme o `mode` atual. |
| Tabela | `components/TypeView/ListView/ListView.tsx` | `"use client"`; TanStack Table só pra exibir — paginação e ordenação são sempre do servidor. |
| Wrapper por módulo | `modules/<nome>/components/<Modulo>ListView.tsx` | `"use client"`; importa as próprias `columns.ts` (`ColumnDef` não atravessa Server→Client, ver `AGENTS.md` §4.1.5). |
| Criação | `components/TypeView/CreateRecordSheet.tsx` ou rota `/new` | Sheet padrão se o módulo não declara `createMode: "detail"`. |

Usam esse padrão hoje: `feedbacks`, `users`, `roles`, `permissions`,
`tenants`, e os três módulos da demo (`demo-pessoas`, `demo-atividades`,
`demo-atendimentos`).

## 2. Estado da lista vive na URL

`AGENTS.md` §4.1.9: busca, página, ordenação e view (`?view=`) são
sempre query params, nunca estado React solto.

- `mod.parseListState(rawParams)` (por módulo, via
  `createListQueryState()`) lê a URL e monta `SearchArgs`
  (`core/data-provider/types.ts`): `searchText`, `filters`, `sort`,
  `pagination`.
- `ListView` navega com `serializeListState(searchParams, patch)` +
  `router.push` ao trocar página ou coluna de ordenação — nunca chama
  `setState` local pra isso.
- `dataProvider.search(moduleName, args)` roda no Server Component
  (`TypeViewScreen`); a resposta (`SearchResult<T>`) já vem com a página
  certa — `ListView` só renderiza o que recebeu.

## 3. Colunas

`columns.ts` por módulo exporta `ColumnDef<AppTableFeatures, T>[]`
(`@tanstack/react-table`). Cabeçalho ordenável por padrão (clique
dispara `onSortingChange` → `navigate({ sortField, sortDirection })`).
Célula customizada (`cell: ({ row }) => ...`) é o jeito de mostrar label
em vez de valor crú (ex.: mapa de status → texto em português — ver
`demo/pessoas/components/columns.ts`).

## 4. Linha → detalhe

Clique em qualquer linha (`TableRow onClick`) navega para
`${detail}/${row.original.id}`, onde `detail` é o prefixo de rota que o
wrapper do módulo passa pra `ListView` (ex.: `/develop/demo/pessoas`).
Não há link por célula — a linha inteira é clicável.

## 5. Busca

`RecordSearch` (topbar, `AppTopbar center=`) é um `SearchInput`
controlado pela URL (`searchText`), com contagem de resultados
(`pagination.total`). Submissão também passa por
`serializeListState`/`router.push` — mesmo motor da paginação/ordenação.

## 6. Vazio e paginação

- Lista vazia: `EmptyState` ("Nenhum registro encontrado."), sem
  paginação embaixo.
- Paginação: texto "Página X de Y (N registro(s))" + botões
  anterior/próxima, desabilitados nas bordas — nunca recalculada no
  cliente, só reflete `pagination` que já veio do servidor.

## 7. Fora do escopo deste documento

Filtros por coluna (além de busca livre), seleção em massa, exportação,
colunas configuráveis pelo usuário — nenhum desses existe hoje. Ficam
pra quando um módulo real pedir (`AGENTS.md` §2) ou entrarem no plano
(`docs/PLAN-fundacao-ux.md`, U3).
