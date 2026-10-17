# Fase 1 — DataProvider

> Baseado no padrão real de `TerceiroGestor/system_development` (`frontend/src/web-client/data-provider/`). Aplicado aqui na feature `favorites`.

---

## 1. Conceito

### 1.1 O problema que o DataProvider resolve

Sem um `DataProvider`, cada componente de UI que precisa de dado chama o `apiServer` diretamente:

```ts
// Sem DataProvider — acoplamento direto
const favorites = await apiServer.get("/favorites", { params: { search, page } });
```

Isso parece inofensivo com uma feature. Com dez features, cada uma acumula seu próprio jeito de chamar a API: uma passa `page`, outra `pageIndex`; uma usa `filter`, outra `where`; uma trata erro de token expirado, outra não trata. Cada componente de tela (`ListView`, `CalendarView`, `DetailShellEngine`) que você construir nas próximas fases precisaria saber os detalhes de **cada** feature pra funcionar — o que é o oposto de "componente reutilizável".

### 1.2 A solução: um contrato único

`DataProvider` é uma **interface**, no sentido literal de TypeScript: um conjunto fixo de métodos que qualquer fonte de dado deve implementar, não importa qual seja a feature por trás.

```ts
type DataProvider = {
  search<T>(model: string, args: SearchArgs): Promise<SearchResult<T>>;
  read<T>(model: string, id: string): Promise<T>;
  create<T>(model: string, payload: unknown): Promise<T>;
  update<T>(model: string, id: string, payload: unknown): Promise<T>;
  delete(model: string, id: string): Promise<void>;
};
```

Toda tela do sistema — seja `favorites`, `tasks`, `projects` — conversa **só** com esses cinco métodos. Nunca com `fetch`, nunca com `apiServer` direto. Isso é o padrão arquitetural chamado **Adapter** (ou também conhecido como Repository Pattern): uma camada fina que traduz um contrato genérico para chamadas específicas de uma fonte real.

### 1.3 Por que isso importa especificamente pro seu objetivo

Lembra do seu objetivo original: `TypeView`, `PainelSearchShell`, `DetailShell` reutilizáveis entre features. Isso só é possível se esses componentes não precisarem saber nada sobre `favorites` vs. `tasks` vs. `projects`. O `DataProvider` é a peça que garante isso: ele recebe `model: string` (ex: `"favorites.list"`) e devolve sempre o mesmo formato de resposta (`SearchResult<T>`), não importa a feature. Sem essa camada, a Fase 2 (`TypeView`) não teria como ser genérica de verdade.

---

## 2. Tecnologias e conceitos envolvidos

| Tecnologia/conceito | Por que aparece aqui |
|---|---|
| **TypeScript Generics** (`<T>`) | `search<T>` deixa o `DataProvider` não saber (nem precisar saber) o formato exato do dado — quem chama decide o tipo |
| **Union types / Discriminated switch** | O `model: string` funciona como uma chave que decide, dentro da implementação, qual função real chamar |
| **Promise / async-await** | Toda operação é assíncrona, já que depende de rede |
| **Closures e memoização manual** | O padrão de *deduplicação de requisições in-flight* usa um `Map` fechado dentro da função que cria o provider |
| **Padrão Adapter / Repository** | Conceito de arquitetura de software: uma camada que adapta um contrato genérico a uma implementação concreta |
| **Injeção de dependência simples** | O provider recebe o `token` (ou contexto de auth) na criação, não em cada chamada — quem usa o provider não precisa saber de autenticação |

Você não precisa de nenhuma lib nova pra essa fase — é TypeScript puro + o `apiServer` que você já tem.

---

## 3. Design da solução

### 3.1 As peças que vamos criar

```
lib/data-provider/
  types.ts       ← os tipos do contrato (DataProvider, SearchArgs, SearchResult...)
  provider.ts     ← a implementação real (createDataProvider), que por baixo usa o apiServer
  index.ts        ← ponto único de exportação
```

### 3.2 Anatomia dos tipos (`types.ts`)

Cada tipo tem uma razão de existir — vamos justificar um por um:

**`SearchArgs`** — o "pedido" de busca. Standardiza o que qualquer tela pode pedir, independente da feature:

```ts
export type SortDirection = "asc" | "desc";
export type SortSpec = { field: string; direction: SortDirection };
export type PaginationSpec = { pageIndex: number; pageSize: number };

export type SearchArgs = {
  searchText?: string;
  filters?: Record<string, unknown>;   // equivalente simplificado do "domain" do projeto real
  groupBy?: string[];
  sort?: SortSpec[];
  pagination?: PaginationSpec;
};
```

Por que `pageIndex` começando em 0 e não `page` começando em 1? Porque é o padrão que React (e a maioria das libs de tabela, incluindo TanStack) usa — evita conversão manual espalhada pelo código.

**`SearchResult<T>`** — a "resposta" de busca. Sempre no mesmo formato, não importa a feature:

```ts
export type SearchResult<T> = {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};
```

**`DataProvider`** — o contrato final, juntando tudo:

```ts
export type DataProvider = {
  search<T>(model: string, args: SearchArgs): Promise<SearchResult<T>>;
  read<T>(model: string, id: string): Promise<T>;
  create<T>(model: string, payload: unknown): Promise<T>;
  update<T>(model: string, id: string, payload: unknown): Promise<T>;
  delete(model: string, id: string): Promise<void>;
};
```

### 3.3 Por que `model: string` em vez de uma função por feature

Alternativa que você poderia imaginar: `favoritesProvider.search(args)`, `tasksProvider.search(args)`, um provider por feature. Isso funcionaria, mas quebraria a promessa de componente genérico: o `TypeView` da Fase 2 teria que receber "qual provider usar" como prop extra, e cada feature nova exigiria uma nova prop tipada.

Com `model: string`, o `TypeView` (e todo o resto) só precisa saber **um único objeto `dataProvider`** e uma **string identificando o que buscar**. Isso é exatamente o padrão do projeto real: `dataProvider.search("tasks.list", args)`, `dataProvider.search("favorites.list", args)` — mesma função, modelo diferente.

O preço que se paga por essa flexibilidade é um `switch(model)` dentro da implementação (fase 3.4). É um trade-off consciente: perde um pouco de type-safety automático (o TS não vai saber sozinho que `"favorites.list"` retorna `Favorite[]`), ganha um contrato 100% uniforme pra UI. Na Fase 4 (Registry), voltamos nesse ponto pra reforçar a tipagem por módulo.

### 3.4 Anatomia da implementação (`provider.ts`)

```ts
export function createDataProvider(): DataProvider {
  return {
    async search<T>(model: string, args: SearchArgs) {
      switch (model) {
        case "favorites.list":
          return searchFavorites(args) as unknown as Promise<SearchResult<T>>;
        default:
          throw new Error(`Model não suportado: ${model}`);
      }
    },
    async read<T>(model: string, id: string) {
      switch (model) {
        case "favorites.detail":
          return readFavorite(id) as unknown as Promise<T>;
        default:
          throw new Error(`read() não implementado para ${model}`);
      }
    },
    // create, update, delete seguem o mesmo padrão
  };
}
```

Cada `case` delega pra uma função específica daquela feature (`searchFavorites`, `readFavorite`...), que é quem de fato chama o `apiServer`. Essa separação em dois níveis (contrato genérico → função específica) é o que permite adicionar uma feature nova sem tocar nas outras: você só adiciona um novo `case` e uma nova função, nunca edita o que já existe.

### 3.5 Deduplicação de requisições in-flight

Cenário real: o usuário está na tela de favoritos, o `TypeView` dispara um `search`, e ao mesmo tempo o `PainelSearchShell` (que ainda não existe, mas vai existir na Fase 3) também tenta buscar contagem total pra mostrar no badge. Sem proteção, isso vira **duas requisições idênticas simultâneas**.

A solução do projeto real: um `Map` guardando promises em andamento, usando uma chave que representa o pedido:

```ts
const inflightSearchRequests = new Map<string, Promise<unknown>>();

function withInFlightRequest<T>(
  store: Map<string, Promise<unknown>>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const existing = store.get(key);
  if (existing) return existing as Promise<T>;

  const request = load().finally(() => store.delete(key));
  store.set(key, request as Promise<unknown>);
  return request;
}
```

Como funciona, passo a passo:

1. Chega um pedido de `search` com uma chave (ex: `JSON.stringify(["search", model, args])`)
2. Se já existe uma Promise em andamento com essa mesma chave no `Map`, devolve ela mesma — ninguém dispara um novo fetch
3. Se não existe, dispara o `load()` (que faz o fetch de verdade), guarda a Promise no `Map`
4. Quando a Promise resolve (ou falha), `.finally()` remove a entrada do `Map` — a próxima chamada idêntica vai gerar um fetch novo

Isso é **memoização temporal**: não é cache permanente (o resultado não fica guardado depois que a Promise resolve), é só proteção contra chamadas simultâneas idênticas.

---

## 4. Código completo — aplicando em `favorites`

### 4.1 `lib/data-provider/types.ts`

```ts
export type SortDirection = "asc" | "desc";
export type SortSpec = { field: string; direction: SortDirection };
export type PaginationSpec = { pageIndex: number; pageSize: number };

export type SearchArgs = {
  searchText?: string;
  filters?: Record<string, unknown>;
  groupBy?: string[];
  sort?: SortSpec[];
  pagination?: PaginationSpec;
};

export type SearchResult<T> = {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

export type DataProvider = {
  search<T>(model: string, args: SearchArgs): Promise<SearchResult<T>>;
  read<T>(model: string, id: string): Promise<T>;
  create<T>(model: string, payload: unknown): Promise<T>;
  update<T>(model: string, id: string, payload: unknown): Promise<T>;
  delete(model: string, id: string): Promise<void>;
};
```

### 4.2 `lib/data-provider/rest/favorites.ts`

Aqui é onde o `apiServer` de verdade entra — traduzindo `SearchArgs` genérico pro formato que o backend `study` espera.

**Dois detalhes do seu `apiServer` real que mudam o código em relação a uma lib tipo axios:**

1. Ele **não** aceita um segundo argumento `{ params: {...} }` — é um wrapper fino sobre `fetch`, então a query string precisa ser montada manualmente com `URLSearchParams` e concatenada na própria URL.
2. Ele **não** devolve um objeto `{ data: ... }` — a função já retorna o corpo da resposta direto (`return data as T` internamente). Você tipa a resposta via **generic** (`apiServer.get<T>(url)`) e acessa os campos direto no retorno, sem `.data`.

```ts
import { apiServer } from "@/lib/api-server"; // ajuste pro caminho real do seu apiServer
import type { SearchArgs, SearchResult } from "@/lib/data-provider/types";
import type { Favorite } from "@/types/favorite";

export async function searchFavorites(args: SearchArgs): Promise<SearchResult<Favorite>> {
  const query = new URLSearchParams();

  if (args.searchText) query.set("search", args.searchText);
  if (args.groupBy?.length) query.set("groupBy", args.groupBy.join(","));
  if (args.sort?.[0]) {
    query.set("sortField", args.sort[0].field);
    query.set("sortDirection", args.sort[0].direction);
  }
  query.set("page", String((args.pagination?.pageIndex ?? 0) + 1)); // backend espera 1-based
  query.set("limit", String(args.pagination?.pageSize ?? 20));

  if (args.filters) {
    for (const [key, value] of Object.entries(args.filters)) {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    }
  }

  // response já É o corpo da resposta — sem wrapper .data
  const response = await apiServer.get<{
    items: Favorite[]; // confira com o backend: pode ser "items" ou "data", tem que bater
    total: number;
    page: number;
    limit: number;
  }>(`/favorites?${query.toString()}`);

  return {
    data: response.items,
    pagination: {
      total: response.total,
      page: response.page,
      limit: response.limit,
      pages: Math.ceil(response.total / response.limit),
    },
  };
}

export async function readFavorite(id: string): Promise<Favorite> {
  return apiServer.get<Favorite>(`/favorites/${id}`);
}

export async function createFavorite(payload: unknown): Promise<Favorite> {
  return apiServer.post<Favorite>("/favorites", payload);
}

export async function updateFavorite(id: string, payload: unknown): Promise<Favorite> {
  return apiServer.put<Favorite>(`/favorites/${id}`, payload);
}

export async function deleteFavorite(id: string): Promise<void> {
  await apiServer.delete(`/favorites/${id}`);
}
```

**Ponto importante:** essa é a **única** peça do sistema que sabe que o backend usa `page` 1-based, o nome exato dos campos da resposta (`items` vs `data`), etc. Se o backend mudar amanhã, você edita só este arquivo — o `DataProvider` e tudo que vier depois continuam intocados.

> **Nota sobre a URL:** se o `api-server.ts` concatena uma base terminada em `/` com um path que começa em `/`, aparece um erro tipo `Cannot GET /api//favorites` (barra dupla). Corrige isso uma vez, na raiz (função de montagem de URL), removendo barras extras nas duas pontas antes de concatenar — não é responsabilidade do `DataProvider`, é da camada de transporte.

### 4.3 `lib/data-provider/provider.ts`

```ts
import type { DataProvider, SearchArgs, SearchResult } from "@/lib/data-provider/types";
import {
  searchFavorites,
  readFavorite,
  createFavorite,
  updateFavorite,
  deleteFavorite,
} from "@/lib/data-provider/rest/favorites";

const inflightSearchRequests = new Map<string, Promise<unknown>>();
const inflightReadRequests = new Map<string, Promise<unknown>>();

function withInFlightRequest<T>(
  store: Map<string, Promise<unknown>>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const existing = store.get(key);
  if (existing) return existing as Promise<T>;

  const request = load().finally(() => store.delete(key));
  store.set(key, request as Promise<unknown>);
  return request;
}

export function createDataProvider(): DataProvider {
  return {
    async search<T>(model: string, args: SearchArgs) {
      const key = JSON.stringify(["search", model, args]);
      return withInFlightRequest(inflightSearchRequests, key, async () => {
        switch (model) {
          case "favorites.list":
            return (await searchFavorites(args)) as unknown as SearchResult<T>;
          default:
            throw new Error(`Model não suportado: ${model}`);
        }
      });
    },

    async read<T>(model: string, id: string) {
      const key = JSON.stringify(["read", model, id]);
      return withInFlightRequest(inflightReadRequests, key, async () => {
        switch (model) {
          case "favorites.detail":
            return (await readFavorite(id)) as unknown as T;
          default:
            throw new Error(`read() não implementado para ${model}`);
        }
      });
    },

    async create<T>(model: string, payload: unknown) {
      switch (model) {
        case "favorites.detail":
          return (await createFavorite(payload)) as unknown as T;
        default:
          throw new Error(`create() não implementado para ${model}`);
      }
    },

    async update<T>(model: string, id: string, payload: unknown) {
      switch (model) {
        case "favorites.detail":
          return (await updateFavorite(id, payload)) as unknown as T;
        default:
          throw new Error(`update() não implementado para ${model}`);
      }
    },

    async delete(model: string, id: string) {
      switch (model) {
        case "favorites.detail":
          await deleteFavorite(id);
          return;
        default:
          throw new Error(`delete() não implementado para ${model}`);
      }
    },
  };
}
```

### 4.4 `lib/data-provider/index.ts`

```ts
export type * from "@/lib/data-provider/types";
export { createDataProvider } from "@/lib/data-provider/provider";
```

Esse arquivo existe só por convenção de import limpo: em qualquer lugar do app, você importa de um único lugar (`@/lib/data-provider`), sem precisar saber a estrutura interna da pasta.

---

## 5. Uso prático

### 5.1 Instanciando o provider — Server Component, sem `"use client"`

**Ponto crítico da sua arquitetura:** o `apiServer` depende de `cookies()` (`next/headers`), que só existe no servidor. Se `favorites/page.tsx` tiver `"use client"`, toda a cadeia de import (`page → data-provider → apiServer → session`) é arrastada pro bundle do browser e o Next quebra o build. Por isso, essa página **tem que** ser Server Component puro:

```tsx
// app/(app)/favorites/page.tsx — Server Component, SEM "use client"
import { createDataProvider } from "@/lib/data-provider";
import type { Favorite } from "@/types/favorite";

export default async function FavoritesPage() {
  const dataProvider = createDataProvider();

  const result = await dataProvider.search<Favorite>("favorites.list", {
    searchText: "",
    pagination: { pageIndex: 0, pageSize: 20 },
  });

  return (
    <div>
      <p>Total: {result.pagination.total}</p>
      <pre>{JSON.stringify(result.data, null, 2)}</pre>
    </div>
  );
}
```

Repare que `createDataProvider()` não precisa de `useMemo` aqui — isso só faria sentido em Client Component pra evitar recriar o objeto a cada render. No servidor, a função roda uma vez por request, então não há esse problema.

**Regra geral pra guardar:** qualquer coisa que precise de interação do usuário (digitar numa busca, clicar num filtro) vai virar um Client Component pequeno e isolado — mas ele **nunca** chama `dataProvider.search` diretamente. Ele só muda a URL (`router.push`), e quem reage a isso buscando dado de novo é o Server Component pai. Isso vai ficar concreto na Fase 3 (`RecordListHost`).

### 5.2 Teste 1 — o caminho feliz

Dá refresh na página (sem precisar clicar em nada — é SSR de verdade, o dado já chega pronto no HTML) e confirme que `result.data` traz os favoritos e `result.pagination.total` bate com a quantidade real no backend. Se aparecer `Cannot GET /api//favorites` (barra dupla) ou erro lendo `.items`/`.total`, revise a nota da seção 4.2 sobre `apiServer`.

### 5.3 Teste 2 — validando a deduplicação

Como agora tudo roda no servidor, o cenário de teste muda: em vez de "dois cliques do usuário", o que dispara duas chamadas simultâneas é **duas partes da árvore de Server Components pedindo o mesmo `search` durante o mesmo request** (ex: a página principal e um componente de contagem/badge, algo que vai aparecer naturalmente a partir da Fase 3). Por enquanto, valide de forma mais simples: chame `dataProvider.search` duas vezes seguidas com o mesmo `model`+`args` dentro do mesmo `page.tsx` (sem `await` entre elas, disparando as duas antes de qualquer uma resolver) e confirme via `console.log` dentro de `searchFavorites` que o fetch real só acontece uma vez.

### 5.4 Teste 3 — model não suportado

Chame `dataProvider.search("favorites.nonexistent", {})` de propósito e confirme que cai no `throw new Error("Model não suportado...")`. Isso valida que o contrato está protegendo contra uso incorreto.

---

## 6. Escalando para múltiplas features

### 6.1 O problema de continuar copiando o padrão do `switch`

O `provider.ts` da seção 4.3 tem um `switch(model)` com `case "favorites.list"`, `case "favorites.detail"`. Funciona bem com uma feature. Mas se você for adicionando `tasks`, `projects` do mesmo jeito, esse arquivo vira um switch gigante com dezenas de `case`s — e toda vez que uma feature nova aparece, você edita um arquivo central que não tem nada a ver com ela. Isso é exatamente o tipo de acoplamento que o `DataProvider` deveria evitar: a ideia era isolar a UI de como o dado é buscado, não criar um novo ponto único de fricção.

### 6.2 A solução: cada feature exporta seu próprio mapa de handlers

Em vez de um `switch` centralizado, cada feature exporta um objeto de handlers, e o `provider.ts` só **combina** esses objetos — ele não sabe o que cada handler faz por dentro.

```ts
// lib/data-provider/rest/favorites.ts
// (as funções searchFavorites, readFavorite, etc. continuam iguais à seção 4.2 —
// só adicionamos o objeto de handlers no final do arquivo)

export const favoritesHandlers = {
  search: (args: SearchArgs) => searchFavorites(args),
  read: (id: string) => readFavorite(id),
  create: (payload: unknown) => createFavorite(payload),
  update: (id: string, payload: unknown) => updateFavorite(id, payload),
  delete: (id: string) => deleteFavorite(id),
};
```

Quando uma feature nova existir (ex: `tasks`), ela segue o mesmo molde:

```ts
// lib/data-provider/rest/tasks.ts (exemplo — feature ainda não existe no seu projeto)
export const tasksHandlers = {
  search: (args: SearchArgs) => searchTasks(args),
  read: (id: string) => readTask(id),
  create: (payload: unknown) => createTask(payload),
  update: (id: string, payload: unknown) => updateTask(id, payload),
  delete: (id: string) => deleteTask(id),
};
```

### 6.3 `provider.ts` atualizado — lookup em objeto em vez de `switch`

```ts
import type { DataProvider, SearchArgs, SearchResult } from "@/lib/data-provider/types";
import { favoritesHandlers } from "@/lib/data-provider/rest/favorites";
// import { tasksHandlers } from "@/lib/data-provider/rest/tasks"; // quando existir

type ModelHandlers = {
  search: (args: SearchArgs) => Promise<unknown>;
  read: (id: string) => Promise<unknown>;
  create: (payload: unknown) => Promise<unknown>;
  update: (id: string, payload: unknown) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
};

// Um registro central, mas agora ele só REFERENCIA os handlers de cada
// feature — nunca contém a lógica de busca em si. Adicionar uma feature
// nova é uma linha aqui, não um novo bloco de lógica.
const registry: Record<string, ModelHandlers> = {
  favorites: favoritesHandlers,
  // tasks: tasksHandlers,
};

function resolveModel(model: string): { feature: string; handlers: ModelHandlers } {
  // "favorites.list" -> feature = "favorites"
  const feature = model.split(".")[0];
  const handlers = registry[feature];
  if (!handlers) throw new Error(`Model não suportado: ${model}`);
  return { feature, handlers };
}

const inflightSearchRequests = new Map<string, Promise<unknown>>();
const inflightReadRequests = new Map<string, Promise<unknown>>();

function withInFlightRequest<T>(
  store: Map<string, Promise<unknown>>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const existing = store.get(key);
  if (existing) return existing as Promise<T>;

  const request = load().finally(() => store.delete(key));
  store.set(key, request as Promise<unknown>);
  return request;
}

export function createDataProvider(): DataProvider {
  return {
    async search<T>(model: string, args: SearchArgs) {
      const key = JSON.stringify(["search", model, args]);
      return withInFlightRequest(inflightSearchRequests, key, async () => {
        const { handlers } = resolveModel(model);
        return handlers.search(args) as Promise<SearchResult<T>>;
      });
    },

    async read<T>(model: string, id: string) {
      const key = JSON.stringify(["read", model, id]);
      return withInFlightRequest(inflightReadRequests, key, async () => {
        const { handlers } = resolveModel(model);
        return handlers.read(id) as Promise<T>;
      });
    },

    async create<T>(model: string, payload: unknown) {
      const { handlers } = resolveModel(model);
      return handlers.create(payload) as Promise<T>;
    },

    async update<T>(model: string, id: string, payload: unknown) {
      const { handlers } = resolveModel(model);
      return handlers.update(id, payload) as Promise<T>;
    },

    async delete(model: string, id: string) {
      const { handlers } = resolveModel(model);
      await handlers.delete(id);
    },
  };
}
```

**O que mudou de fato:**

- O `switch(model)` com um `case` por operação por feature virou **duas coisas**: um `registry` (mapa `feature → handlers`) e um `resolveModel` que extrai o nome da feature a partir do `model` (`"favorites.list"` → `"favorites"`).
- Cada arquivo `rest/<feature>.ts` continua sendo a única peça que sabe os detalhes daquela feature — igual antes. O que mudou é só como o `provider.ts` os encontra.
- Adicionar uma feature nova agora é: criar `rest/tasks.ts` com o mesmo molde, e adicionar **uma linha** no `registry` do `provider.ts`. Nenhuma lógica nova é escrita em `provider.ts`.

### 6.4 Por que isso ainda não é o ideal (e o que vem depois)

Esse padrão já resolve a duplicação de lógica, mas ainda existe um `import` manual por feature dentro de `provider.ts` — toda feature nova exige editar essa lista de imports e a entrada no `registry`. No projeto real (`TerceiroGestor`), isso vai um passo além: existe um **Registry** de verdade (`web-client/registry/`) em que cada `moduleDefinition` se registra sozinho, sem exigir edição de um arquivo central. Isso é exatamente a Fase 4 do seu plano (Registry + `moduleDefinition`) — o padrão desta seção é o degrau necessário antes disso: sem sentir a costura manual do `import` + `registry`, a motivação pra `defineRecordModule` na Fase 4 ficaria abstrata demais.

### 6.5 Teste — validando que a migração não quebrou nada

Depois de trocar o `switch` pelo `registry`/`resolveModel`, rode de novo os 3 testes da seção 5 (caminho feliz, deduplicação, model não suportado). O comportamento observável deve ser **idêntico** ao de antes — essa refatoração muda só a organização interna, não o contrato público do `DataProvider`. Se algum teste que passava antes falhar agora, é sinal de que algo no `resolveModel` ou no `registry` está errado, não que o conceito mudou.

### 6.6 Teste — simulando uma segunda feature sem criar uma de verdade

Pra sentir o padrão funcionando com mais de uma feature, sem precisar implementar `tasks` de verdade ainda, crie um mock temporário:

```ts
// lib/data-provider/rest/__mock-feature.ts (arquivo temporário, só pra teste)
export const mockFeatureHandlers = {
  search: async () => ({ data: [{ id: 1, title: "Mock" }], pagination: { total: 1, page: 1, limit: 20, pages: 1 } }),
  read: async (id: string) => ({ id, title: "Mock" }),
  create: async (payload: unknown) => payload,
  update: async (id: string, payload: unknown) => ({ id, ...(payload as object) }),
  delete: async () => {},
};
```

Adiciona `mockFeature: mockFeatureHandlers` no `registry`, chama `dataProvider.search("mockFeature.list", {})` e confirma que retorna o dado mockado — sem tocar em nada de `favorites`. Isso prova, na prática, que as duas features vivem isoladas dentro do mesmo `DataProvider`. Depois do teste, pode apagar o arquivo mock.

---

## 7. Checkpoint — perguntas que você precisa saber responder antes de ir pra Fase 2

1. Por que `search` recebe um `model: string` em vez de o `DataProvider` ser um objeto diferente por feature?
2. Se o backend `study` mudar o nome do campo `items` para `results` na resposta de `/favorites`, quantos arquivos você precisa editar? Por quê?
3. O que aconteceria se você removesse o `.finally(() => store.delete(key))` do `withInFlightRequest`? (Pense: a segunda chamada, feita depois que a primeira já terminou, o que ela receberia?)
4. Por que `pagination.pageIndex` começa em 0 no contrato do `DataProvider`, mas a função `searchFavorites` soma `+1` antes de mandar pro backend?
5. Explique com suas palavras a diferença entre o contrato (`types.ts`) e a implementação (`provider.ts` + `rest/favorites.ts`) — por que essa separação existe?
6. Por que `favorites/page.tsx` não pode ter `"use client"` nessa arquitetura, mesmo que isso facilitasse testar com um `onClick`? O que exatamente quebra, e onde?
7. Na versão com `registry`/`resolveModel` (seção 6.3), o que exatamente o `resolveModel` extrai do `model` recebido, e por que essa convenção (`"feature.operacao"`) é o que permite um único `registry` atender várias features?
8. Se você esquecer de adicionar uma feature nova no `registry` do `provider.ts`, mas já tiver criado `rest/tasks.ts` corretamente, o que acontece quando alguém chamar `dataProvider.search("tasks.list", {})`? Em que ponto exato do código isso é detectado?
9. Por que a Fase 4 (Registry + `moduleDefinition`) só faz sentido depois de você sentir a dor do `import` manual descrita na seção 6.4 — o que exatamente o Registry automatiza que o padrão desta fase ainda faz manualmente?

Quando você conseguir responder essas 9 sem consultar o material, a Fase 1 está fechada de vez e partimos pra Fase 2 (`TypeView`).
