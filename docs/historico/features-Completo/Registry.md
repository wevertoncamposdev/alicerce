# Fase 4 — Registry + moduleDefinition

> Baseado no padrão real de `TerceiroGestor/system_development` (`frontend/src/web-client/registry/`, `web-client/starter/record-module-starter.tsx`, `modules/tasks/config/tasks-module-contract.tsx`). Aplicado aqui na feature `favorites`, fechando o ciclo iniciado na Fase 1.

---

## 1. Conceito

### 1.1 A dor que ficou pendente desde a Fase 1

Lembra da seção 6 da Fase 1? Resolvemos o `switch` gigante trocando por um `registry: Record<string, ModelHandlers>` — mas você ainda precisa, manualmente, por feature nova:
- criar `rest/<feature>.ts`
- importar esse arquivo em `provider.ts`
- adicionar uma linha no objeto `registry`

E isso é só o `DataProvider`. Você tem a **mesma costura manual** se repetindo em outros lugares que já construiu:
- `columns` de `favorites` vivem soltas em `columns.tsx`, referenciadas manualmente em `FavoritesListView`
- `VALID_MODES` (modos de view válidos) está hardcoded dentro de `page.tsx`
- `parseFavoritesListState`/`serializeFavoritesListState` são importados manualmente também em `page.tsx` e `SearchInput`

Cada peça funciona, mas **nada as amarra formalmente como "isso tudo é a definição do módulo favorites"**. Se você abrir uma feature nova (`tasks`) hoje, precisa tocar em uns 6-7 arquivos espalhados, lembrando de cada convenção de nome, sem nenhum lugar que documente "isso é tudo que um módulo precisa".

### 1.2 A solução: um objeto único que descreve o módulo inteiro

`moduleDefinition` é um objeto — criado por uma função `defineRecordModule` — que **centraliza tudo que já construímos** nas Fases 1-3 em um único contrato tipado:

```ts
const favoritesModule = defineRecordModule({
  model: "favorites",
  dataHandlers: { search: searchFavorites, read: readFavorite, /* ... */ },
  views: ["list", "cards", "graph", "text"],
  defaultView: "list",
  parseListState: parseFavoritesListState,
  serializeListState: serializeFavoritesListState,
});
```

Esse objeto não substitui nada que você já fez — ele **referencia** o que já existe (`searchFavorites` da Fase 1, `parseFavoritesListState` da Fase 3). O que muda é que, a partir de agora, o `DataProvider`, o `TypeView`/`page.tsx` não fazem mais lookup manual espalhado — eles recebem um `favoritesModule` já pronto e extraem dele o que precisam.

### 1.3 O Registry: onde os módulos se registram sozinhos

Se `moduleDefinition` resolve "o que é um módulo", o **Registry** resolve "onde encontrar todos os módulos existentes" — sem que nenhum arquivo central precise listar cada feature manualmente (o que ainda tínhamos no `provider.ts` da Fase 1).

```ts
// registry/index.ts
const modules = new Map<string, RecordModuleDefinition>();

export function registerModule(definition: RecordModuleDefinition) {
  modules.set(definition.model, definition);
}

export function getModule(model: string): RecordModuleDefinition {
  const found = modules.get(model);
  if (!found) throw new Error(`Módulo não registrado: ${model}`);
  return found;
}
```

Cada feature, no seu próprio arquivo de configuração, se auto-registra:

```ts
// modules/favorites/config/favorites-module-contract.ts
export const favoritesModule = defineRecordModule({ ... });
registerModule(favoritesModule);
```

E em algum ponto de bootstrap da aplicação (um único arquivo que só faz `import`s, sem lógica), todos os módulos existentes são carregados:

```ts
// registry/bootstrap.ts
import "@/modules/favorites/config/favorites-module-contract";
// import "@/modules/tasks/config/tasks-module-contract"; // quando existir
```

**A diferença crucial em relação à Fase 1:** antes, `provider.ts` precisava saber `favoritesHandlers` e importar de um caminho específico. Agora, `provider.ts` só pergunta ao Registry "me dá o módulo `favorites`" — ele nunca importa nada de feature diretamente. Quem se anuncia é a feature, não quem consome.

### 1.4 Por que isso só fazia sentido depois das Fases 1-3, não antes

Se eu tivesse te dado `defineRecordModule` na Fase 1, você estaria configurando um objeto abstrato sem saber o que cada campo dele realmente faz por baixo. Agora você já escreveu `searchFavorites`, `parseFavoritesListState`, `favoriteColumns` com as próprias mãos e sentiu a dor de coordenar tudo manualmente — então `moduleDefinition` não é um conceito novo, é a **nomeação e centralização** de um padrão que você já vinha repetindo.

---

## 2. Tecnologias e conceitos envolvidos

| Tecnologia/conceito | Por que aparece aqui |
|---|---|
| **Factory function tipada** (`defineRecordModule<T>`) | Função que recebe um objeto de configuração e devolve o mesmo objeto, mas com inferência de tipo — o TypeScript "aprende" o formato de `T` a partir do que você passou |
| **Map como registro global** | Estrutura em memória que guarda `model → definition`, populada via efeito colateral controlado (`registerModule`) |
| **Module side-effects / barrel de bootstrap** | Um arquivo que só existe pra forçar a execução de outros módulos (`import "..."` sem usar o resultado) — técnica específica pra "auto-registro" |
| **Generics + inferência (`infer`, `typeof`)** | Pra que `getModule("favorites")` devolva um tipo específico de `Favorite`, não `unknown`, seria necessário generics avançados — vamos ver a versão simples nesta fase e o limite dela |
| **Barrel exports** | Organização de imports para o Registry não crescer em complexidade de caminho de arquivo |

Nenhuma lib nova — é composição do que você já tem.

---

## 3. Design da solução

### 3.1 As peças que vamos criar

```
lib/registry/
  types.ts        ← formato do RecordModuleDefinition
  index.ts         ← registerModule / getModule (o Map)
  bootstrap.ts      ← import de todos os moduleDefinition existentes

modules/favorites/config/
  favorites-module-contract.ts   ← defineRecordModule(...) de favorites
```

Note que isso introduz uma pasta `modules/` — se seu projeto ainda organiza tudo dentro de `app/` ou `features/`, essa é a hora de decidir onde a "configuração" de cada feature vai morar. O projeto real usa `modules/<feature>/config/` separado de `app/` (que só tem as rotas) — vale adotar essa convenção agora, já que a Fase 4 é justamente sobre formalizar essa separação.

### 3.2 O tipo `RecordModuleDefinition`

```ts
// lib/registry/types.ts
import type { SearchArgs, SearchResult } from "@/lib/data-provider/types";

export type RecordModuleDataHandlers<T> = {
  search: (args: SearchArgs) => Promise<SearchResult<T>>;
  read: (id: string) => Promise<T>;
  create: (payload: unknown) => Promise<T>;
  update: (id: string, payload: unknown) => Promise<T>;
  delete: (id: string) => Promise<void>;
};

export type RecordModuleDefinition<T = unknown> = {
  model: string;
  label: string;
  views: string[];
  defaultView: string;
  dataHandlers: RecordModuleDataHandlers<T>;
  parseListState: (searchParams: Record<string, string | string[] | undefined>) => SearchArgs;
  serializeListState: (current: URLSearchParams, patch: Record<string, unknown>) => URLSearchParams;
};
```

**Por que cada campo está aqui, e não outros que você poderia imaginar:** repare que isso é literalmente um resumo do que cada fase anterior produziu — `dataHandlers` é a Fase 1, `views`/`defaultView` é a Fase 2, `parseListState`/`serializeListState` é a Fase 3. `moduleDefinition` não inventa conceito novo, ele **cataloga** o que já existe.

### 3.3 `defineRecordModule` — por que essa função existe, se ela "só" retorna o que recebeu

```ts
export function defineRecordModule<T>(definition: RecordModuleDefinition<T>): RecordModuleDefinition<T> {
  return definition;
}
```

Isso parece inútil à primeira vista — a função não transforma nada. O valor dela é **puramente de tipagem**: sem essa função, se você escrevesse um objeto solto, o TypeScript infere tipos "largos" demais (`string` genérico em vez do literal exato). Com `defineRecordModule<T>`, você consegue escrever `defineRecordModule<Favorite>({...})` e o TypeScript passa a checar, campo a campo, se `dataHandlers.search` realmente devolve `SearchResult<Favorite>` e não qualquer outra coisa — é uma técnica chamada **identity function com generic explícito**, comum em bibliotecas TypeScript (você já viu isso sem saber, é como `defineConfig` do Vite/Next funciona).

### 3.4 Por que o Registry usa side-effect de import, em vez de uma lista manual

A alternativa mais óbvia seria:
```ts
// registry/index.ts
import { favoritesModule } from "@/modules/favorites/config/favorites-module-contract";
export const allModules = [favoritesModule /* , tasksModule, ... */];
```
Isso ainda seria uma lista manual — exatamente a costura que queremos eliminar. A técnica de "bootstrap por side-effect" (seção 4.3) empurra essa lista pra um único arquivo cujo propósito **é só esse** (registrar tudo), separado do Registry em si. A diferença é sutil, mas importante: o `registry/index.ts` fica genuinamente genérico (não conhece `favorites`), e só `bootstrap.ts` conhece a lista de features — e esse arquivo é tão simples que editar ele não é "acoplamento", é só um índice, parecido com um `sitemap`.

---

## 4. Código completo — aplicando em `favorites`

### 4.1 `lib/registry/types.ts`

(já mostrado na seção 3.2 — copie de lá)

### 4.2 `lib/registry/index.ts`

```ts
import "server-only"; // registry roda só no servidor, já que dataHandlers usa apiServer
import type { RecordModuleDefinition } from "./types";

const modules = new Map<string, RecordModuleDefinition>();

export function registerModule<T>(definition: RecordModuleDefinition<T>): void {
  if (modules.has(definition.model)) {
    throw new Error(`Módulo "${definition.model}" já registrado — nome duplicado?`);
  }
  modules.set(definition.model, definition as RecordModuleDefinition);
}

export function getModule<T = unknown>(model: string): RecordModuleDefinition<T> {
  const found = modules.get(model);
  if (!found) {
    throw new Error(`Módulo não registrado: "${model}". Confira se ele está importado em registry/bootstrap.ts`);
  }
  return found as RecordModuleDefinition<T>;
}
```

**Por que `throw` no registro duplicado:** dois módulos com o mesmo `model` seria um bug silencioso perigoso — o segundo sobrescreveria o primeiro sem aviso. Falhar alto e cedo (fail-fast) é melhor que descobrir isso via um bug esquisito em produção meses depois.

### 4.3 `lib/registry/bootstrap.ts`

```ts
import "server-only";

// Cada linha aqui é uma feature existente. O import roda o código de
// nível superior do arquivo (que inclui o registerModule(...)), mas não
// precisamos do valor exportado — por isso não há "import { x } from".
import "@/modules/favorites/config/favorites-module-contract";
// import "@/modules/tasks/config/tasks-module-contract";
```

Esse arquivo precisa ser importado **uma vez**, cedo, antes de qualquer `getModule` ser chamado — normalmente no layout raiz do grupo de rotas autenticadas:

```ts
// app/(app)/layout.tsx
import "@/lib/registry/bootstrap"; // side-effect: popula o registry
// ... resto do layout
```

### 4.4 `modules/favorites/config/favorites-module-contract.ts`

```ts
import { defineRecordModule } from "@/lib/registry";
import { registerModule } from "@/lib/registry";
import {
  searchFavorites,
  readFavorite,
  createFavorite,
  updateFavorite,
  deleteFavorite,
} from "@/lib/data-provider/rest/favorites";
import {
  parseFavoritesListState,
  serializeFavoritesListState,
} from "@/lib/query-state/favorites-query-state";
import type { Favorite } from "@/types/favorite";

export const favoritesModule = defineRecordModule<Favorite>({
  model: "favorites",
  label: "Favoritos",
  views: ["list", "cards", "graph", "text"],
  defaultView: "list",
  dataHandlers: {
    search: searchFavorites,
    read: readFavorite,
    create: createFavorite,
    update: updateFavorite,
    delete: deleteFavorite,
  },
  parseListState: parseFavoritesListState,
  serializeListState: serializeFavoritesListState,
});

registerModule(favoritesModule);
```

**Este arquivo é o que o starter (`record-module-starter.tsx`) do projeto real gera automaticamente pra cada feature nova** — é o "checklist de módulo" virando código: se ele existe e está preenchido, a feature está completa o suficiente pra ser encontrada pelo resto do sistema.

### 4.5 Atualizando `provider.ts` (Fase 1) pra usar o Registry

```ts
// lib/data-provider/provider.ts
import "server-only";
import { getModule } from "@/lib/registry";
import type { DataProvider, SearchArgs, SearchResult } from "@/lib/data-provider/types";

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

function resolveModel(model: string) {
  const [feature] = model.split(".");
  return getModule(feature); // agora vem do Registry, não de um objeto local
}

export function createDataProvider(): DataProvider {
  return {
    async search<T>(model: string, args: SearchArgs) {
      const key = JSON.stringify(["search", model, args]);
      return withInFlightRequest(inflightSearchRequests, key, async () => {
        const module = resolveModel(model);
        return module.dataHandlers.search(args) as Promise<SearchResult<T>>;
      });
    },
    async read<T>(model: string, id: string) {
      const key = JSON.stringify(["read", model, id]);
      return withInFlightRequest(inflightReadRequests, key, async () => {
        const module = resolveModel(model);
        return module.dataHandlers.read(id) as Promise<T>;
      });
    },
    async create<T>(model: string, payload: unknown) {
      return resolveModel(model).dataHandlers.create(payload) as Promise<T>;
    },
    async update<T>(model: string, id: string, payload: unknown) {
      return resolveModel(model).dataHandlers.update(id, payload) as Promise<T>;
    },
    async delete(model: string, id: string) {
      await resolveModel(model).dataHandlers.delete(id);
    },
  };
}
```

**Note o que sumiu:** o `import { favoritesHandlers } from "./rest/favorites"` e o objeto `registry: Record<string, ModelHandlers>` local (da Fase 1, seção 6.3) não existem mais aqui. `provider.ts` agora **nunca** importa nada de uma feature específica — ele só conhece `getModule`, genérico. Se você adicionar `tasks` amanhã, este arquivo não muda nem uma linha.

### 4.6 Simplificando `page.tsx` com o `moduleDefinition`

```tsx
// app/(app)/favorites/page.tsx
import { getModule } from "@/lib/registry";
import { createDataProvider } from "@/lib/data-provider";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { RecordListHost } from "@/components/record-list-host/RecordListHost";
import { TypeView, type TypeViewMode } from "@/components/type-view/TypeView";
import { MenuView } from "@/components/type-view/MenuView";
import { FavoritesListView } from "@/components/type-view/list-view/FavoritesListView";
import { FavoritesGraphView } from "@/components/type-view/graph-view/FavoritesGraphView";
import type { Favorite } from "@/types/favorite";

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const favoritesModule = getModule<Favorite>("favorites");

  const view = typeof rawParams.view === "string" ? rawParams.view : favoritesModule.defaultView;
  const mode = (favoritesModule.views.includes(view) ? view : favoritesModule.defaultView) as TypeViewMode;

  const args = favoritesModule.parseListState(rawParams);

  const dataProvider = createDataProvider();
  const result = await dataProvider.search<Favorite>("favorites.list", args);

  return (
    <div>
      <AppTopbar title={favoritesModule.label} actions={<MenuView current={mode} />} />
      <div className="p-6">
        <RecordListHost searchText={args.searchText} viewSwitcher={null}>
          <TypeView
            data={result.data}
            mode={mode}
            listView={<FavoritesListView data={result.data} />}
            graphView={<FavoritesGraphView favorites={result.data} />}
          />
        </RecordListHost>
      </div>
    </div>
  );
}
```

**A mudança mais importante desta seção:** `VALID_MODES` (hardcoded na Fase 3) virou `favoritesModule.views` (vem da configuração). `"Favoritos"` (texto fixo no `AppTopbar`) virou `favoritesModule.label`. Isso não é só estética — significa que, quando você aplicar esse mesmo `page.tsx` como modelo pra `tasks`, a única coisa que muda de verdade é a linha `getModule<Task>("tasks")` e os componentes de view específicos (`TasksListView` em vez de `FavoritesListView`). A "forma" da página se tornou reutilizável de verdade.

---

## 5. Uso prático

### 5.1 Teste 1 — o registro acontece antes do uso

Remova temporariamente o `import "@/lib/registry/bootstrap"` do `layout.tsx` e acesse `/favorites`. Confirme que você recebe o erro `Módulo não registrado: "favorites". Confira se ele está importado em registry/bootstrap.ts` — isso prova que o `getModule` realmente depende do bootstrap ter rodado, não é mágica automática.

Coloca o import de volta e confirma que volta a funcionar.

### 5.2 Teste 2 — registro duplicado é bloqueado

Temporariamente, chame `registerModule(favoritesModule)` duas vezes (duplicando a linha em `favorites-module-contract.ts`). Confirme que o app quebra com `Módulo "favorites" já registrado`. Remove a duplicata depois.

### 5.3 Teste 3 — `page.tsx` não sabe mais os modos hardcoded

Edita `views` dentro de `favoritesModule` pra remover `"graph"` temporariamente. Acesse `/favorites?view=graph` e confirme que cai automaticamente pro `defaultView` (`"list"`) — a validação de modo agora vem 100% da configuração, não de uma lista solta no `page.tsx`.

### 5.4 Teste 4 — o ciclo completo, de ponta a ponta

Sem alterar nenhum outro arquivo, edite só `favoritesModule.label` pra `"Meus Favoritos"`. Confirme que o `AppTopbar` reflete a mudança sem tocar em `page.tsx` — prova de que a UI realmente lê a configuração, não tem texto duplicado em paralelo.

---

## 6. Checkpoint — perguntas que você precisa saber responder antes de fechar o ciclo Fases 1-4

1. O que exatamente `defineRecordModule` faz em runtime? Se a resposta for "quase nada", por que ela ainda vale a pena existir?
2. Por que `provider.ts` (Fase 1) não importa mais nada de `rest/favorites.ts` diretamente? O que ele importa agora, e por quê isso é melhor?
3. Explique a diferença entre "o Registry" (`lib/registry/index.ts`) e "o bootstrap" (`lib/registry/bootstrap.ts`) — por que não é o mesmo arquivo?
4. Se você esquecer de adicionar `import "@/modules/tasks/config/tasks-module-contract"` no `bootstrap.ts`, mas todo o resto de `tasks` estiver implementado corretamente, o que exatamente vai falhar, e em que momento (build, ou runtime, ou os dois)?
5. Compare o esforço de adicionar uma feature nova **antes** da Fase 4 (quantos arquivos você tocava, incluindo `provider.ts`, `page.tsx`) com **depois** da Fase 4. O que realmente diminuiu?
6. `RecordModuleDefinition<T>` tem um generic `T`. O que aconteceria de errado (ou o que o TypeScript deixaria de proteger) se você tirasse esse generic e usasse `unknown` fixo em todo lugar?

Quando você conseguir responder essas 6 sem consultar o material, as Fases 1-4 estão consolidadas — você tem uma base de `DataProvider` + `TypeView` + `RecordListHost` + `Registry` funcionando de ponta a ponta, pronta pra receber uma segunda feature de verdade. A partir da Fase 5 (`FormView` + autosave), o foco muda de "listar e visualizar" para "criar e editar".