# Curso: Construindo o Design System (Fases 6-10)

> Formato: cada fase é dividida em **etapas**. Cada etapa tem: conceito → código pra escrever → o que testar → checkpoint de entendimento. Você implementa, roda, e só avança quando a etapa fizer sentido.

Pré-requisito: `favorites` já tem page, createForm, Item, `[id]`page, updateForm, tudo consumindo `apiServer` diretamente do Server Component (arquitetura definida na Fase 5).

---

# FASE 6 — TypeView: modo `list` e `cards`

**Objetivo da fase:** criar o componente `TypeView`, que recebe dados e decide como renderizá-los, começando pelos dois modos mais simples.

## Etapa 6.1 — Estrutura mínima do TypeView

**Conceito:** `TypeView` é um componente "burro" (dumb component). Ele não busca dado, não sabe de `apiServer`. Ele só recebe `data` + `mode` via props e escolhe o layout. Isso é o padrão de **separação entre busca de dado e apresentação**.

**Código:**

```tsx
// components/TypeView/TypeView.tsx
type TypeViewMode = "list" | "cards" | "calendar" | "timeline";

type TypeViewProps<T> = {
  data: T[];
  mode: TypeViewMode;
};

export function TypeView<T>({ data, mode }: TypeViewProps<T>) {
  switch (mode) {
    case "list":
      return <div>modo list — {data.length} itens</div>;
    case "cards":
      return <div>modo cards — {data.length} itens</div>;
    default:
      return <div>modo {mode} ainda não implementado</div>;
  }
}
```

```tsx
// app/favorites/page.tsx — use temporariamente pra testar
<TypeView data={favorites} mode="list" />
```

**Teste:** troque `mode="list"` por `mode="cards"` manualmente e veja o texto mudar.

**Checkpoint:** Por que `TypeView<T>` usa um generic em vez de tipar direto pra `Favorite`? (Pense na reutilização futura em outras features.)

---

## Etapa 6.2 — TanStack Table vs. tabela própria

**Conceito:** antes de codar o modo `list` de verdade, decida a ferramenta. TanStack Table é **headless** — ele cuida da lógica (sort, paginação, colunas) e você cuida 100% do HTML/CSS. Isso combina com seu objetivo de ter um design system próprio.

**Instalação:**

```bash
npm install @tanstack/react-table
```

**Código — definindo colunas:**

```tsx
// components/TypeView/ListView/columns.tsx
import { ColumnDef } from "@tanstack/react-table";
import { Favorite } from "@/types/favorite";

export const favoriteColumns: ColumnDef<Favorite>[] = [
  { accessorKey: "title", header: "Título" },
  { accessorKey: "category", header: "Categoria" },
  { accessorKey: "createdAt", header: "Criado em" },
];
```

**Teste mental antes de codar:** o que significa `accessorKey`? É a chave do objeto `data` que a coluna vai ler — se `Favorite` não tiver `title`, a coluna quebra silenciosamente (fica vazia). Confira o tipo antes de seguir.

**Checkpoint:** por que `columns` fica em arquivo separado do componente de tabela? (Dica: pense em reuso — outra feature vai ter outras colunas, mas a mesma tabela genérica por baixo.)

---

## Etapa 6.3 — Implementando o ListView

**Conceito:** `useReactTable` monta o "motor" da tabela a partir de `data` + `columns`. Você renderiza o HTML manualmente usando os helpers que ele devolve (`getHeaderGroups`, `getRowModel`).

**Código:**

```tsx
// components/TypeView/ListView/ListView.tsx
"use client";
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from "@tanstack/react-table";

export function ListView<T>({ data, columns }: { data: T[]; columns: ColumnDef<T>[] }) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Por que `"use client"` aqui:** `useReactTable` usa hooks (estado interno de sort/paginação), então precisa rodar no client, mesmo que o dado tenha vindo de um Server Component pai.

**Teste:** conecte no `TypeView`:

```tsx
case "list":
  return <ListView data={data} columns={favoriteColumns} />;
```

Rode e confira se a tabela aparece com os favoritos reais vindos do `apiServer`.

**Checkpoint:** se você tentasse colocar `useReactTable` dentro do `page.tsx` (Server Component) direto, o que aconteceria? Por que isolar em `ListView` resolve isso?

---

## Etapa 6.4 — Sorting na tabela

**Conceito:** TanStack Table já resolve a lógica de ordenação, você só precisa guardar o estado (`sorting`) e conectar aos headers.

**Código:**

```tsx
const [sorting, setSorting] = useState<SortingState>([]);

const table = useReactTable({
  data, columns,
  state: { sorting },
  onSortingChange: setSorting,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
});
```

```tsx
<th onClick={header.column.getToggleSortingHandler()}>
  {flexRender(header.column.columnDef.header, header.getContext())}
  {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
</th>
```

**Teste:** clique no header "Título" e veja a lista ordenar.

**Checkpoint:** esse `sorting` é estado local do componente (`useState`) — ele NÃO está na URL ainda. Isso é um problema? (Pense: se o usuário der refresh, a ordenação se perde. Guardamos isso pra Fase 8, quando URL-as-state entra com o `PainelSearchShell`.)

---

## Etapa 6.5 — Modo Cards

**Conceito:** mesmo dado, layout de grid em vez de tabela. Aqui não precisa de biblioteca — é CSS grid/flex puro.

**Código:**

```tsx
// components/TypeView/CardsView/CardsView.tsx
export function CardsView<T extends { id: string | number; title: string }>({ data }: { data: T[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
      {data.map((item) => (
        <div key={item.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
          <strong>{item.title}</strong>
        </div>
      ))}
    </div>
  );
}
```

**Checkpoint (fecha a fase):**

1. Por que `CardsView` usa `T extends { id, title }` em vez de generic livre como `TypeView`?
2. Se amanhã você quiser adicionar um modo `kanban`, quais arquivos você tocaria e quais ficariam intocados?

---

# FASE 7 — TypeView: `calendar`, `timeline` + Suspense

## Etapa 7.1 — Modo Timeline

**Conceito:** dado ordenado cronologicamente, cada item como um "marco" numa linha vertical/horizontal. Diferente do `list`/`cards`, aqui a **ordem importa visualmente**, então normalmente pré-ordena o array antes de renderizar.

**Código:**

```tsx
// components/TypeView/TimelineView/TimelineView.tsx
export function TimelineView<T extends { id: string | number; title: string; createdAt: string }>({ data }: { data: T[] }) {
  const sorted = [...data].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <ol style={{ borderLeft: "2px solid #ccc", paddingLeft: 16 }}>
      {sorted.map((item) => (
        <li key={item.id} style={{ marginBottom: 12 }}>
          <time style={{ fontSize: 12, color: "#888" }}>{new Date(item.createdAt).toLocaleDateString()}</time>
          <div>{item.title}</div>
        </li>
      ))}
    </ol>
  );
}
```

**Checkpoint:** por que ordenar dentro do `TimelineView` e não confiar que o `apiServer` já manda ordenado?

## Etapa 7.2 — Modo Calendar

**Conceito:** aqui a forma do dado muda — você precisa **agrupar** por dia antes de renderizar. Isso é diferente de `list`/`cards`/`timeline`, que só reorganizam visualmente o mesmo array plano.

**Código:**

```tsx
// components/TypeView/CalendarView/groupByDay.ts
export function groupByDay<T extends { createdAt: string }>(data: T[]) {
  return data.reduce<Record<string, T[]>>((acc, item) => {
    const day = new Date(item.createdAt).toISOString().slice(0, 10);
    acc[day] = acc[day] ? [...acc[day], item] : [item];
    return acc;
  }, {});
}
```

```tsx
// CalendarView.tsx
export function CalendarView<T extends { id: string | number; title: string; createdAt: string }>({ data }: { data: T[] }) {
  const grouped = groupByDay(data);
  return (
    <div>
      {Object.entries(grouped).map(([day, items]) => (
        <div key={day}>
          <strong>{day}</strong>
          <ul>{items.map((i) => <li key={i.id}>{i.title}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}
```

**Checkpoint:** essa é sua primeira view que **transforma** o dado antes de exibir (não só reordena). Guarde essa distinção — ela volta na Fase 8 quando `group` (do `PainelSearchShell`) fizer algo parecido, só que vindo direto do `apiServer`.

## Etapa 7.3 — Suspense por modo

**Conceito:** cada modo pode demorar diferente pra ficar pronto (calendar/timeline processam mais). `<Suspense>` permite mostrar fallback só daquele pedaço, sem travar a página toda.

**Código:**

```tsx
// app/favorites/page.tsx
import { Suspense } from "react";

<Suspense fallback={<p>Carregando visualização...</p>}>
  <TypeView data={data} mode={mode} />
</Suspense>
```

**Nota:** pra Suspense funcionar de verdade (não só decorativo), o componente dentro precisa ser `async` ou ter uma fonte de dado que suspende (ex: `use(promise)`). Se `data` já chega pronto do pai, o Suspense aqui não terá efeito real ainda — isso é intencional, você vai sentir a diferença na Fase 9 com `RelationShell` (lazy load por tab).

**Checkpoint (fecha a fase):** troque entre os 4 modos via um `<select>` temporário e confirme que todos renderizam com o mesmo array de favoritos, sem duplicar fetch.

---

# FASE 8 — PainelSearchShell

## Etapa 8.1 — Search via URL

**Conceito:** revisão do padrão URL-as-state (já visto antes), agora formalizado como componente reutilizável.

**Código:**

```tsx
// components/PainelSearchShell/SearchInput.tsx
"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

export function SearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSearch = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams);
    value ? params.set("search", value) : params.delete("search");
    router.push(`${pathname}?${params.toString()}`);
  }, 300);

  return <input placeholder="Buscar..." defaultValue={searchParams.get("search") ?? ""} onChange={(e) => handleSearch(e.target.value)} />;
}
```

**Instalação:** `npm install use-debounce`

**Teste:** digite algo, veja a URL mudar depois de 300ms, e confirme (com `console.log` no Server Component) que `searchParams.search` chega correto no `page.tsx`.

**Checkpoint:** por que o debounce é essencial agora e não era tão crítico quando os dados vinham de um array em memória (fases antigas)?

## Etapa 8.2 — Filtros estruturados

**Conceito:** múltiplos filtros = múltiplos query params, cada um controlado de forma independente.

**Código:**

```tsx
// components/PainelSearchShell/FilterSelect.tsx
"use client";
export function FilterSelect({ paramKey, options }: { paramKey: string; options: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams);
    value ? params.set(paramKey, value) : params.delete(paramKey);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select defaultValue={searchParams.get(paramKey) ?? ""} onChange={(e) => handleChange(e.target.value)}>
      <option value="">Todos</option>
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}
```

**Teste:** `<FilterSelect paramKey="category" options={["work", "study", "personal"]} />` — confirme que `?category=work` chega no `page.tsx` junto com `search`.

**Checkpoint:** por que `FilterSelect` é genérico (`paramKey` como prop) em vez de ter um componente `CategoryFilter` fixo?

## Etapa 8.3 — dynamicFilter

**Conceito:** o usuário escolhe **qual campo** filtrar antes de escolher o valor. Isso exige um schema descrevendo os filtros disponíveis.

**Código:**

```tsx
// types/filter.ts
type FilterSchema = {
  key: string;
  label: string;
  type: "select" | "text" | "date";
  options?: string[];
};

const favoriteFilters: FilterSchema[] = [
  { key: "category", label: "Categoria", type: "select", options: ["work", "study"] },
  { key: "title", label: "Título", type: "text" },
];
```

```tsx
// DynamicFilter.tsx — renderiza o input certo baseado no schema escolhido
export function DynamicFilter({ schema }: { schema: FilterSchema[] }) {
  const [activeKey, setActiveKey] = useState(schema[0]?.key);
  const active = schema.find((f) => f.key === activeKey);

  return (
    <div>
      <select value={activeKey} onChange={(e) => setActiveKey(e.target.value)}>
        {schema.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select>
      {active?.type === "select" && <FilterSelect paramKey={active.key} options={active.options ?? []} />}
      {active?.type === "text" && <SearchInput /* adaptar paramKey */ />}
    </div>
  );
}
```

**Checkpoint:** essa é a primeira vez no plano que UI é gerada a partir de **configuração** (schema) em vez de JSX fixo. Por que isso importa pro seu objetivo de arquitetura reutilizável entre features?

## Etapa 8.4 — Group

**Conceito:** `group=category` como query param que muda a **forma** dos dados retornados — o `apiServer` (ou uma transformação local, como fizemos no `groupByDay`) agrupa antes de passar pro `TypeView`.

**Código:**

```tsx
// app/favorites/page.tsx
const { search, category, group } = await searchParams;
const data = await apiServer.favorites.list({ search, category });
const finalData = group ? groupBy(data, group) : data;
```

**Checkpoint (fecha a fase):** conecte `PainelSearchShell` completo (search + filter + group) na página de favorites e confirme que os 4 modos do `TypeView` respeitam os filtros ativos.

---

# FASE 9 — MetaDataShell + RelationShell

## Etapa 9.1 — MetaDataShell

**Conceito:** exibe metadados sem fazer fetch próprio — recebe o item já carregado pelo `DetailShell` pai.

**Código:**

```tsx
// components/MetaDataShell/MetaDataShell.tsx
export function MetaDataShell({ item }: { item: { createdAt: string; createdBy: string; status: string } }) {
  return (
    <aside>
      <p>Status: {item.status}</p>
      <p>Criado em: {new Date(item.createdAt).toLocaleDateString()}</p>
      <p>Criado por: {item.createdBy}</p>
    </aside>
  );
}
```

**Checkpoint:** por que `MetaDataShell` não recebe um `id` e busca sozinho? (Pense em quantos requests desnecessários isso evitaria vs. só passar o item já buscado.)

## Etapa 9.2 — RelationShell com tabs

**Conceito:** tabs que representam grupos de dados relacionados, cada uma buscando sob demanda.

**Código:**

```tsx
// components/RelationShell/RelationShell.tsx
"use client";
import { useState } from "react";

type Tab = { key: string; label: string };

export function RelationShell({ tabs, children }: { tabs: Tab[]; children: (activeKey: string) => React.ReactNode }) {
  const [active, setActive] = useState(tabs[0]?.key);

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActive(tab.key)} style={{ fontWeight: active === tab.key ? "bold" : "normal" }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div>{children(active)}</div>
    </div>
  );
}
```

## Etapa 9.3 — Lazy load por tab

**Conceito:** cada tab só busca dado quando ativada, usando Suspense de verdade dessa vez (componente `async`).

**Código:**

```tsx
// RelatedFavorites.tsx (Server Component, async)
export async function RelatedFavorites({ itemId }: { itemId: string }) {
  const related = await apiServer.favorites.related(itemId);
  return <ul>{related.map((r) => <li key={r.id}><a href={`/favorites/${r.id}`}>{r.title}</a></li>)}</ul>;
}
```

```tsx
// uso dentro do RelationShell
<RelationShell tabs={[{ key: "related", label: "Relacionados" }]}>
  {(active) => active === "related" && (
    <Suspense fallback={<p>Carregando relacionados...</p>}>
      <RelatedFavorites itemId={item.id} />
    </Suspense>
  )}
</RelationShell>
```

**Checkpoint (fecha a fase):** clique no link de um item relacionado — ele deve te levar pra `/favorites/[id]` de novo, ou seja, o **mesmo** `DetailShell` se aplicando recursivamente a outro item. Isso é a recursividade que sustenta toda a arquitetura.

---

# FASE 10 — DetailShell (composição final)

## Etapa 10.1 — FormView com useOptimistic

**Conceito:** autosave otimista — a UI assume que salvou antes da confirmação do servidor, e reverte se der erro.

**Código:**

```tsx
"use client";
import { useOptimistic, useTransition } from "react";

export function FormView({ item, onSave }: { item: Favorite; onSave: (data: Favorite) => Promise<Favorite> }) {
  const [optimisticItem, setOptimisticItem] = useOptimistic(item);
  const [, startTransition] = useTransition();

  function handleChange(field: string, value: string) {
    const updated = { ...optimisticItem, [field]: value };
    startTransition(async () => {
      setOptimisticItem(updated);
      await onSave(updated);
    });
  }

  return <input value={optimisticItem.title} onChange={(e) => handleChange("title", e.target.value)} />;
}
```

**Checkpoint:** o que acontece na UI, na prática, entre o `setOptimisticItem` e o `await onSave` terminar? E se `onSave` falhar?

## Etapa 10.2 — Composição do DetailShell

**Código:**

```tsx
export function DetailShell<T extends { id: string | number }>({
  item, onSave, relationTabs,
}: {
  item: T;
  onSave: (data: T) => Promise<T>;
  relationTabs: Tab[];
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr" }}>
      <FormView item={item} onSave={onSave} />
      <MetaDataShell item={item as any} />
      <RelationShell tabs={relationTabs}>{/* ... */}</RelationShell>
    </div>
  );
}
```

## Etapa 10.3 — Tipagem genérica final

**Conceito:** com os 3 componentes já existindo, o `DetailShell<T>` deixa de ser teórico — o `T` precisa satisfazer o que `FormView`, `MetaDataShell` e `RelationShell` exigem.

**Checkpoint final do plano inteiro:**

1. Abra um favorito, edite o título, confirme autosave
2. Veja metadata atualizando (createdBy/status)
3. Clique num relacionado — o mesmo `DetailShell` deve renderizar pro novo item
4. Volte pra lista — `TypeView` + `PainelSearchShell` devem manter o filtro que estava ativo

Se os 4 passos funcionarem, a arquitetura está validada de ponta a ponta — pronta pra ser levada pro projeto real `study`.
