# Fase 3 — RecordListHost

> Baseado no padrão real de `TerceiroGestor/system_development` (`frontend/src/web-client/record/RecordListHost.tsx`, `web-client/control-panel/`). Aplicado aqui na feature `favorites`, unindo o `DataProvider` (Fase 1) e o `TypeView` (Fase 2).

---

## 1. Conceito

### 1.1 O que resolvemos até aqui, e o que ainda falta

Fase 1 resolveu **como buscar** dado (`DataProvider`). Fase 2 resolveu **como exibir** um dado já pronto (`TypeView` com `list`/`cards`/`graph`/`text`). Mas até agora, o `page.tsx` de `favorites` ainda busca com argumentos fixos:

```ts
const result = await dataProvider.search<Favorite>("favorites.list", {
  searchText: "",
  pagination: { pageIndex: 0, pageSize: 20 },
});
```

Não existe busca de verdade, nem paginação real controlada pelo usuário, nem forma de o usuário mudar o que está vendo sem editar código. `RecordListHost` é a peça que junta **busca controlada pelo usuário** (`SearchArgs` vindo da URL) com **a exibição** (`TypeView`) — ele é o "orquestrador" que faz a página de lista funcionar de ponta a ponta.

### 1.2 A ideia central: URL como o único estado de verdade da tela de lista

Você já viu esse princípio na Fase 2 com `?view=`. Agora ele se expande: **toda** entrada que afeta o que aparece na lista — texto de busca, página atual, ordenação, futuramente filtros — vira parte da URL, serializada de forma padronizada. Isso não é só elegância técnica; resolve três problemas reais:

1. **Compartilhamento**: colar o link pra alguém mostra exatamente a mesma busca/filtro/página
2. **Histórico do browser**: apertar "voltar" desfaz a última mudança de busca, como o usuário espera
3. **Refresh não perde nada**: já vimos isso, mas agora vale pra busca e paginação também, não só pro modo de view

### 1.3 Por que isso não é "mais do mesmo" do `ViewSwitcher`

No `ViewSwitcher`, você tinha **um** parâmetro (`view`) com valores simples (string). Agora `SearchArgs` é um objeto com `searchText`, `sort` (array de objetos), `pagination` (objeto). Serializar isso numa URL exige uma convenção — e é aqui que entra o conceito central desta fase: um **schema de serialização por módulo**, que sabe transformar `SearchArgs ↔ URLSearchParams` de forma consistente e reversível.

### 1.4 Onde o `RecordListHost` se encaixa na árvore de componentes

```
page.tsx (Server Component)
  ↓ lê searchParams cru
  ↓ chama parseListState(searchParams) → SearchArgs tipado
  ↓ chama dataProvider.search("favorites.list", args)  — Fase 1
  ↓ passa data + args pro RecordListHost

RecordListHost (Client Component, orquestrador)
  ↓ renderiza SearchInput (Fase 3) + ViewSwitcher (Fase 2)
  ↓ renderiza TypeView (Fase 2) com o data recebido
  ↓ quando o usuário digita/pagina, atualiza a URL via router.push
```

`RecordListHost` não busca dado — quem busca continua sendo o Server Component pai (igual desde a Fase 5 antiga da sua arquitetura). O que `RecordListHost` faz é **orquestrar a interação**: agrupar os controles (busca, view switcher, paginação) e garantir que todos leem/escrevem o mesmo estado de URL de forma coordenada.

---

## 2. Tecnologias e conceitos envolvidos

| Tecnologia/conceito | Por que aparece aqui |
|---|---|
| **Schema de serialização (`parse`/`serialize`)** | Funções puras que convertem `SearchArgs ↔ URLSearchParams`, usadas tanto no Server (`parse`) quanto no Client (`serialize`) |
| **`use-debounce`** | Evita disparar uma navegação (e um novo fetch no servidor) a cada tecla digitada |
| **Composição de Client Components pequenos** | `SearchInput`, `ViewSwitcher` continuam isolados; `RecordListHost` só os agrupa, não duplica lógica deles |
| **`URLSearchParams`** | Já usado nas fases anteriores, agora com mais campos coordenados |
| **Prop drilling controlado vs. Context** | Decisão de design: `RecordListHost` usa props diretas (não Context) porque o estado inteiro vem de um lugar só (a URL) — não há necessidade de compartilhar estado profundo entre componentes distantes |

Nenhuma lib nova além de `use-debounce` (já instalada na Fase 2, se você seguiu o plano antigo) — o resto é composição do que já existe.

---

## 3. Design da solução

### 3.1 As peças que vamos criar

```
lib/query-state/
  favorites-query-state.ts   ← parse/serialize específico de favorites

components/record-list-host/
  RecordListHost.tsx          ← orquestrador genérico
  SearchInput.tsx              ← Client Component, só busca por texto
```

### 3.2 Por que o schema de parse/serialize é *por módulo*, não genérico

Você poderia imaginar um `parseSearchArgs(searchParams): SearchArgs` genérico, reaproveitável em toda feature. O problema: cada feature vai ter filtros diferentes no futuro (`favorites` pode ter "só favoritos com tag X", `tasks` vai ter "status", "responsável"). Um parser genérico teria que saber de antemão todos os filtros possíveis de todas as features — voltando ao mesmo problema de acoplamento que resolvemos na Fase 1 com o `registry`.

A solução, espelhando o projeto real, é: cada feature define seu próprio par `parse`/`serialize`, mas ambos seguem a **mesma forma de contrato** (`SearchArgs` da Fase 1). Isso é o mesmo padrào de "contrato genérico + implementação por feature" que já apareceu duas vezes (`DataProvider` na Fase 1, `columns`/views na Fase 2) — reconhecer esse padrão se repetindo é sinal de que você está internalizando a arquitetura, não decorando exemplos soltos.

### 3.3 Por que `parse` roda no Server e `serialize` é chamado no Client

```
Server (page.tsx): searchParams (objeto simples do Next) → parse → SearchArgs
Client (SearchInput): SearchArgs parcial → serialize → URLSearchParams → router.push
```

`parse` só roda no servidor porque é ali que o `SearchArgs` final é necessário (pra chamar `dataProvider.search`). `serialize` só roda no client porque é o `SearchInput`/paginação que decide *mudar* a URL. As duas funções são **puras** (mesma entrada sempre gera a mesma saída, sem efeito colateral) — por isso podem, sem problema, ser importadas tanto em Server quanto em Client Components; a pureza é o que garante que não vão carregar nada tipo `cookies()` que quebraria no client.

### 3.4 Por que debounce entra na busca, mas não na paginação

Já vimos isso na Fase 6 antiga do seu plano original, mas vale reforçar com o contexto atual: cada tecla digitada, sem debounce, dispararia uma navegação e um novo `dataProvider.search` (que agora já sabemos que é uma chamada `SEARCH` real, autenticada, indo pro Nest). Paginação (clicar "próxima página") é um evento discreto — não precisa de debounce, cada clique já é uma intenção clara e única.

---

## 4. Código completo — aplicando em `favorites`

### 4.1 `lib/query-state/favorites-query-state.ts`

```ts
import type { SearchArgs } from "@/lib/data-provider/types";

const DEFAULT_PAGE_SIZE = 20;

export function parseFavoritesListState(
  searchParams: Record<string, string | string[] | undefined>,
): SearchArgs {
  const searchText = typeof searchParams.q === "string" ? searchParams.q : undefined;

  const pageParam = typeof searchParams.page === "string" ? Number(searchParams.page) : 1;
  const pageIndex = Number.isFinite(pageParam) && pageParam > 0 ? pageParam - 1 : 0;

  const sortField = typeof searchParams.sortField === "string" ? searchParams.sortField : undefined;
  const sortDirection =
    searchParams.sortDirection === "asc" || searchParams.sortDirection === "desc"
      ? searchParams.sortDirection
      : undefined;

  return {
    searchText,
    pagination: { pageIndex, pageSize: DEFAULT_PAGE_SIZE },
    sort: sortField ? [{ field: sortField, direction: sortDirection ?? "asc" }] : undefined,
  };
}

export function serializeFavoritesListState(
  current: URLSearchParams,
  patch: Partial<{ searchText: string; pageIndex: number; sortField: string; sortDirection: "asc" | "desc" }>,
): URLSearchParams {
  const params = new URLSearchParams(current);

  if ("searchText" in patch) {
    if (patch.searchText) {
      params.set("q", patch.searchText);
    } else {
      params.delete("q");
    }
    // toda vez que a busca muda, volta pra página 1 — senão o usuário
    // pode ficar numa página 5 que não existe mais no resultado filtrado
    params.delete("page");
  }

  if ("pageIndex" in patch && patch.pageIndex !== undefined) {
    if (patch.pageIndex > 0) {
      params.set("page", String(patch.pageIndex + 1));
    } else {
      params.delete("page");
    }
  }

  if ("sortField" in patch) {
    if (patch.sortField) {
      params.set("sortField", patch.sortField);
      params.set("sortDirection", patch.sortDirection ?? "asc");
    } else {
      params.delete("sortField");
      params.delete("sortDirection");
    }
  }

  return params;
}
```

**Por que existe uma regra escondida aqui (`params.delete("page")` ao mudar a busca):** isso é uma decisão de design, não um detalhe incidental. Sem ela, o usuário poderia estar na página 3 de uma busca ampla, digitar um texto que reduz o resultado pra 1 página, e ficar preso numa "página 3" vazia. Esse tipo de regra de coerência entre campos é exatamente o motivo de centralizar a serialização numa função só, em vez de cada componente mexer na URL por conta própria.

### 4.2 `components/record-list-host/SearchInput.tsx`

```tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search } from "lucide-react";
import { serializeFavoritesListState } from "@/lib/query-state/favorites-query-state";

export function SearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSearch = useDebouncedCallback((value: string) => {
    const params = serializeFavoritesListState(searchParams, { searchText: value });
    router.push(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <div className="relative">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        defaultValue={defaultValue}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Buscar favoritos..."
        className="pl-8 pr-3 py-1.5 border rounded-md text-sm w-64"
      />
    </div>
  );
}
```

Repare: `SearchInput` não sabe nada de `dataProvider`, nem de `TypeView` — ele só lê o estado atual da URL (`searchParams`) e escreve um novo, via `serializeFavoritesListState`. Isso é o mesmo nível de isolamento que `ViewSwitcher` já tinha.

### 4.3 `components/record-list-host/RecordListHost.tsx`

```tsx
import type { ReactNode } from "react";
import { SearchInput } from "./SearchInput";

export function RecordListHost({
  searchText,
  viewSwitcher,
  children,
}: {
  searchText?: string;
  viewSwitcher: ReactNode;
  children: ReactNode; // o TypeView já pronto, vindo de fora
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchInput defaultValue={searchText} />
        {viewSwitcher}
      </div>
      {children}
    </div>
  );
}
```

**Por que `RecordListHost` não é `"use client"`:** repare que ele não usa nenhum hook — só compõe `SearchInput` (client) e `children`/`viewSwitcher` (que já vêm prontos de fora, podendo ser client). Um componente que só agrupa outros, sem estado ou hook próprio, não precisa da diretiva — deixa o Server renderizar a "casca" dele, só as folhas interativas (`SearchInput`, `MenuView`) é que precisam rodar no browser. Isso é otimização de SSR de novo, o mesmo princípio da Fase 2.

### 4.4 `app/(app)/favorites/page.tsx` — juntando tudo

```tsx
import { createDataProvider } from "@/lib/data-provider";
import { parseFavoritesListState } from "@/lib/query-state/favorites-query-state";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { RecordListHost } from "@/components/record-list-host/RecordListHost";
import { TypeView, type TypeViewMode } from "@/components/type-view/TypeView";
import { MenuView } from "@/components/type-view/MenuView";
import { FavoritesListView } from "@/components/type-view/list-view/FavoritesListView";
import { FavoritesGraphView } from "@/components/type-view/graph-view/FavoritesGraphView";
import type { Favorite } from "@/types/favorite";

const VALID_MODES: TypeViewMode[] = ["list", "cards", "text", "graph"];

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const view = typeof rawParams.view === "string" ? rawParams.view : "list";
  const mode: TypeViewMode = VALID_MODES.includes(view as TypeViewMode) ? (view as TypeViewMode) : "list";

  const args = parseFavoritesListState(rawParams);

  const dataProvider = createDataProvider();
  const result = await dataProvider.search<Favorite>("favorites.list", args);

  return (
    <div>
      <AppTopbar title="Favoritos" actions={<MenuView current={mode} />} />
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

**Nota de design consciente:** o `viewSwitcher` do `RecordListHost` ficou `null` porque, na sua estrutura atual, o `MenuView` já mora no `AppTopbar`. Isso é válido — `RecordListHost` aceita `viewSwitcher` como prop opcional-por-composição, mas você não é obrigado a preenchê-la se já resolveu esse controle em outro lugar da tela. O importante é que `SearchInput` (dentro do `RecordListHost`) e `MenuView` (no topbar) **ambos leem e escrevem a mesma URL**, então continuam coordenados mesmo estando em posições visuais diferentes.

---

## 5. Uso prático

### 5.1 Teste 1 — busca com debounce

Digite algo no `SearchInput`. Confirme:

- A URL só muda ~300ms depois de parar de digitar (`?q=...`)
- O resultado da lista reflete a busca
- A página volta pro estado sem `?page=` (por causa da regra da seção 4.1)

### 5.2 Teste 2 — paginação preservando a busca

Adicione temporariamente dois botões de paginação simples chamando `serializeFavoritesListState(searchParams, { pageIndex: N })`. Com uma busca ativa (`?q=algo`), mude de página e confirme que `q` continua na URL — só `page` muda.

### 5.3 Teste 3 — refresh não perde nada

Com `?q=teste&view=cards&page=2` na URL, dê refresh. Confirme que o input de busca já vem preenchido com "teste" (via `defaultValue`), o modo `cards` está ativo, e a paginação está na página certa.

### 5.4 Teste 4 — coerência entre busca e paginação

Vá pra página 2 de uma busca ampla (sem filtro). Digite um texto de busca específico que reduza o resultado pra menos de 2 páginas. Confirme que a URL volta pra `page` removido (página 1), não fica presa em `?page=2` com uma lista vazia.

---

## 6. Checkpoint — perguntas que você precisa saber responder antes de ir pra Fase 4

1. Por que existe um par `parse`/`serialize` **por feature**, em vez de uma função genérica reutilizada por todas?
2. `parseFavoritesListState` roda no Server, `serializeFavoritesListState` é chamado a partir de um Client Component. As duas funções moram no mesmo arquivo — por que isso não causa o mesmo erro de "função cruzando o limite Server/Client" que tivemos na Fase 2 com `columns`?
3. Por que `params.delete("page")` acontece automaticamente dentro de `serializeFavoritesListState` quando `searchText` muda, em vez de cada componente que chama essa função lembrar de fazer isso manualmente?
4. Por que `RecordListHost` não tem `"use client"`, mesmo contendo um `SearchInput` que é client?
5. Se amanhã `favorites` ganhar um filtro por tag, quantos arquivos dessa fase você precisaria tocar, e quais ficariam intocados?

Quando você conseguir responder essas 5 sem consultar o material, a Fase 3 está fechada e partimos pra Fase 4 (Registry + `moduleDefinition`).
