# Contrato de módulo (backend) — busca e escopo por tenant

> Etapa 7.C do `PLAN.md`. Aplicado em `examples`/`notes` (módulo de exemplo
> do template) e `role`/`permission`, provando que generaliza. `user` e
> `tenant` ainda não foram migrados — continuam com a versão copiada e colada
> (ver "O que não foi migrado" no fim).

## 1. O problema que isso resolve

Todo módulo do Alicerce repete duas coisas: "buscar um registro, comparar
contra o tenant (e às vezes contra outro escopo, como o dono ou o
soft-delete), e devolver 404 se não bater" e "calcular paginação a partir de
`SearchBaseDto` e devolver `{ items, total, page, limit }`". Antes da 7.C,
isso estava copiado quase byte-a-byte em `examples.service.ts`,
`roles.service.ts`, `permissions.service.ts`, `user.service.ts` e
`tenant.service.ts` — cada um com uma pequena variação (`examples` também
compara `userId`; `role`/`permission` também comparam `deletedAt`) que
tornava um helper ingênuo (uma classe abstrata fixando os campos) frágil.

`SearchBaseDto.sort`/`.filters`/`.groupBy` eram aceitos no DTO e **nunca
lidos** em nenhum `search()` — o cliente podia mandar qualquer coisa ali
que era silenciosamente ignorada. Pior do ponto de vista de segurança:
implementar `filters` sem whitelist deixaria o cliente filtrar por qualquer
coluna do model, incluindo campos que não deveriam ser expostos a busca.

## 2. Por que funções puras, não uma classe abstrata

A alternativa óbvia seria uma `abstract class TenantScopedService<T>` que os
services estendessem. Descartada porque:

- O "escopo" de comparação varia por módulo (`tenantId` sozinho,
  `tenantId`+`userId`, `tenantId`+`deletedAt`) — uma classe abstrata
  precisaria de flags/opções para cada combinação, ou virar vários mixins.
- Vários services tocam mais de um model Prisma na mesma classe (`RolesService`
  lê `role`, `user`, `permission`, `rolePermission`, `userRole`) — não há um
  único "model delegate" pra injetar no construtor de uma base genérica.
- NestJS/Prisma não precisam de DI aqui: as duas operações são
  determinísticas e sem estado — função pura é testável sem
  `Test.createTestingModule`, só chamando a função direto.

## 3. `findOneOrThrow` (`core/common/utils/find-one-or-throw.util.ts`)

```ts
export function findOneOrThrow<T>(
  entity: T | null | undefined,
  isInScope: (entity: T) => boolean,
  message = 'Recurso não encontrado',
): T
```

Quem chama decide o predicado — o helper só cuida do `null`-check +
`NotFoundException`:

```ts
const example = findOneOrThrow(
  await this.prisma.example.findUnique({ where: { id } }),
  (entry) => entry.tenantId === tenantId && entry.userId === userSub,
  'Example not found or access denied',
);
```

```ts
const role = findOneOrThrow(
  await this.prisma.role.findUnique({ where: { id } }),
  (role) => !role.deletedAt && role.tenantId === tenantId,
  'Role nao encontrada',
);
```

## 4. Busca/paginação (`core/common/utils/tenant-search.util.ts`)

Quatro funções, compostas no `where`/`orderBy` final de cada `search()`:

- `resolvePagination(pagination)` → `{ page, limit, skip, take }`.
  `pageIndex` chega 0-based (convenção do TanStack Table no frontend);
  `page`/`limit` no retorno são 1-based (contrato que o frontend já espera).
- `buildSearchTextWhere(searchText, fields)` → `{ OR: [...] }` com
  `contains`/`insensitive` nos campos informados, ou `{}` se não houver texto.
- `buildWhitelistedFilters(filters, allowedFields)` → aplica
  `query.filters` só nos campos listados; **lança `BadRequestException`** se
  o cliente mandar um campo fora da whitelist.
- `buildWhitelistedOrderBy(sort, allowedFields)` → mesma lógica para
  `query.sort`, devolvendo o array no formato que o Prisma espera em
  `orderBy`.

Cada módulo declara sua própria whitelist (constantes no topo do
`*.service.ts`, não no helper — a whitelist é decisão de cada módulo, não
algo genérico):

```ts
const SEARCHABLE_FIELDS = ['title', 'url'] as const;
const FILTERABLE_FIELDS = ['title', 'url'] as const;
const SORTABLE_FIELDS = ['title', 'url', 'createdAt'] as const;

async search(query: SearchExamplesDto, tenantId: string, userSub: string) {
  const { page, limit, skip, take } = resolvePagination(query.pagination);

  const where = {
    tenantId,
    userId: userSub,
    ...buildSearchTextWhere(query.searchText, SEARCHABLE_FIELDS),
    ...buildWhitelistedFilters(query.filters, FILTERABLE_FIELDS),
  };
  const orderBy = buildWhitelistedOrderBy(query.sort, SORTABLE_FIELDS);

  const [items, total] = await Promise.all([
    this.prisma.example.findMany({ where, skip, take, orderBy: orderBy.length ? orderBy : undefined }),
    this.prisma.example.count({ where }),
  ]);

  return { items, total, page, limit };
}
```

Um módulo que usa um repositório em vez de `this.prisma` direto (`role`)
só precisa que o método `search()` do repositório aceite um `orderBy`
opcional — ver `RoleRepository.search` (`backend/src/modules/role/persistence/role.repository.ts`).

## 5. `groupBy` continua sem implementação

`SearchBaseDto.groupBy` continua declarado e não lido em nenhum `search()`.
Nenhuma view do frontend hoje faz agrupamento (isso é Fase 5 — kanban/
grouped views, fora do escopo desta rodada) — implementar `groupBy` genérico
agora seria construir algo que nada consome ainda. Fica documentado aqui
para não ser "esquecido" por engano: quando uma view de agrupamento existir,
a implementação entra neste mesmo arquivo, ao lado das outras três.

## 6. Bugs reais corrigidos de passagem ao migrar

- `ExampleNotesService.remove` lançava `new Error()` cru em vez de
  `NotFoundException` (violava `AGENTS.md` §3.2.4 — toda 404 de domínio
  deve ser uma exception do Nest, não um `Error` genérico que o
  `AllExceptionsFilter` trataria como 500).
- `examples/dto/search-example.dto.ts` duplicava à mão os 4 campos de
  `SearchBaseDto` com decorators divergentes em vez de estender a base —
  agora é `export class SearchExamplesDto extends SearchBaseDto {}`, igual
  aos demais módulos.
- `PermissionsController`/`PermissionsService` — `findOne`/`update`/`remove`
  não recebiam nem comparavam `tenantId` nenhuma (só `role`/`examples`
  faziam essa checagem). RLS cobria isso na camada do Postgres (defesa em
  profundidade), mas a checagem na aplicação tinha sumido — exatamente o
  cenário que o comentário de `tenant-rls.extension.ts` descreve
  ("se algum guard/service futuro esquecer um `where: { tenantId }`"). Os
  três métodos agora recebem `@TenantId()` no controller e usam
  `findOneOrThrow` com o mesmo predicado dos demais módulos.

## 7. O que não foi migrado (de propósito)

`user.service.ts` e `tenant.service.ts` continuam com a versão própria,
copiada e colada antes da 7.C — o critério de aceite desta etapa era provar
que o helper generaliza com 2 exemplos reais (`examples`/`notes` +
`role`/`permission`), não migrar os 5 módulos de uma vez. `tenant.service.ts`
em particular tem um padrão de comparação diferente (`id !== requestTenantId`,
já que `Tenant` é sua própria raiz de isolamento, não tem campo `tenantId`
próprio) que não se beneficia do mesmo predicado dos outros. Migrar
`user`/`tenant` fica como trabalho futuro, sem bloquear nada do roadmap
atual.
