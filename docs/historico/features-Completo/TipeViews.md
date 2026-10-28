# Fase 2 — TypeView

> Baseado no padrão real de `TerceiroGestor/system_development` (`frontend/src/web-client/views/`, `web-client/control-panel/ViewSwitcher.tsx`). Aplicado aqui na feature `favorites`, consumindo o `DataProvider` da Fase 1.

---

## 1. Conceito

### 1.1 O que é o TypeView

`TypeView` é o componente que decide **como exibir** uma lista de dados — tabela, cards, calendário, timeline — sem nunca saber **de onde** esse dado veio. Ele recebe um array já pronto (`data: T[]`) e uma flag dizendo qual modo usar (`mode: "list" | "cards" | ...`), e delega pra um sub-componente de visualização.

Isso separa duas responsabilidades que, sem essa peça, ficariam misturadas: "buscar dado" (Fase 1, resolvida pelo `DataProvider`) e "decidir layout" (Fase 2, agora). Um Server Component busca o dado via `dataProvider.search`, passa pro `TypeView`, e o `TypeView` só se preocupa em renderizar.

### 1.2 Por que o modo precisa estar na URL, não em `useState`

Se você guardasse o modo ativo com `const [mode, setMode] = useState("list")`, ele se perderia a cada refresh, não seria compartilhável por link, e não teria histórico de navegação (botão voltar do browser não funcionaria). Por isso, desde as fases antigas do seu plano, a regra é: **estado que afeta o que é renderizado na tela principal vive na URL**, não em estado local do React.

Isso significa: quem troca de `list` pra `cards` não chama `setMode(...)` — chama `router.push` mudando o parâmetro `?view=cards` na URL. O Server Component pai lê esse parâmetro via `searchParams` e decide o que passar pro `TypeView`.

### 1.3 Como isso se conecta com o `DataProvider` da Fase 1

```
URL (?view=list&search=...)
   ↓ Server Component (page.tsx) lê searchParams
   ↓ chama dataProvider.search("favorites.list", args) — Fase 1
   ↓ passa data + mode pro TypeView — Fase 2 (agora)
TypeView decide: ListView, CardsView, CalendarView...
```

O `TypeView` nunca importa `dataProvider`. Essa é a linha que separa as duas fases: a Fase 1 resolve "como buscar", a Fase 2 resolve "como mostrar".

---

## 2. Tecnologias e conceitos envolvidos

| Tecnologia/conceito | Por que aparece aqui |
|---|---|
| **TanStack Table** (`@tanstack/react-table`) | Motor headless de tabela — sorting, controle de colunas, sem impor HTML/CSS |
| **`useSearchParams` / `useRouter` / `usePathname`** (Next.js) | Ler e escrever o modo ativo na URL a partir de um Client Component pequeno (o seletor de modo) |
| **Server Component `async`** | A página principal continua sendo Server Component — lê `searchParams` como prop, busca dado, renderiza |
| **Composição por `switch`/discriminated union** | O `TypeView` decide o sub-componente certo a partir de um valor de string tipado (`"list" | "cards"`) |
| **Generics em componentes React** (`TypeView<T>`) | Permite reusar `TypeView` em `favorites`, `tasks`, etc., sem reescrever a lógica de switch |

Instalação necessária:

```bash
npm install @tanstack/react-table
```

---

## 3. Design da solução

### 3.1 As peças que vamos criar

```
components/type-view/
  TypeView.tsx              ← o "toggle" — decide qual view renderizar
  ViewSwitcher.tsx           ← Client Component — botões/select que mudam a URL
  list-view/
    ListView.tsx             ← tabela com TanStack Table
    columns.tsx               ← definição de colunas específica de favorites
  cards-view/
    CardsView.tsx
```

### 3.2 Por que `ViewSwitcher` é um componente separado do `TypeView`

`TypeView` só renderiza — ele não tem `"use client"`, não usa hooks de navegação, porque não precisa: ele só lê props. Quem manipula a URL é um componente **isolado e pequeno**, o `ViewSwitcher`, que é `"use client"` só nele, minimizando o quanto de JavaScript precisa rodar no browser (alinhado ao seu objetivo de "máximo de SSR possível" reafirmado nas fases anteriores).

Isso espelha exatamente o real: no `TerceiroGestor`, `ViewSwitcher.tsx` é `"use client"` e só cuida de troca de modo — ele nem sabe o que é `favorites` ou `tasks`, só recebe `value`, `options`, `onChange`.

### 3.3 Por que `ListView` é a view mais trabalhada (e as outras reaproveitam o padrão)

No projeto real, `ListView.tsx` sozinho tem mais de 600 linhas — porque ele resolve sorting, pinagem de coluna, seleção de linha, agrupamento visual. Pra essa fase, vamos construir um `ListView` **funcional e sólido**, mas mais simples que o do projeto real (sorting + colunas tipadas), deixando pinagem/seleção/agrupamento pra quando forem necessários de verdade (evitar over-engineering antes da hora é uma decisão de design tão válida quanto adicionar a feature).

### 3.4 Tipagem do `TypeView`

```ts
export type TypeViewMode = "list" | "cards";

export type TypeViewProps<T> = {
  data: T[];
  mode: TypeViewMode;
  columns?: ColumnDef<T>[]; // usado só pelo modo list
};
```

O `columns?` é opcional e só relevante pro `ListView` — isso é um sinal de que, quando você adicionar `calendar`/`timeline` na próxima fase, cada modo vai precisar de props específicas próprias. Por enquanto, mantemos simples: dois modos, uma prop compartilhada.

---

## 4. Código completo — aplicando em `favorites`

### 4.1 `components/type-view/list-view/columns.tsx`

```tsx
import type { ColumnDef } from "@tanstack/react-table";
import type { Favorite } from "@/types/favorite";

export const favoriteColumns: ColumnDef<Favorite>[] = [
  {
    accessorKey: "title",
    header: "Título",
  },
  {
    accessorKey: "url",
    header: "URL",
    cell: ({ row }) => (
      <a href={row.original.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
        {row.original.url}
      </a>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Criado em",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("pt-BR"),
  },
];
```

**Por que `columns` fica em arquivo separado:** o `ListView` genérico (próxima seção) não sabe nada sobre `Favorite`. Quando você aplicar isso em `tasks` na Fase 4 (Registry), vai criar `taskColumns` do mesmo jeito, sem tocar no `ListView`.

### 4.2 `components/type-view/list-view/ListView.tsx`

```tsx
"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

export function ListView<T extends { id: string | number }>({
  data,
  columns,
}: {
  data: T[];
  columns: ColumnDef<T>[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">Nenhum item encontrado.</p>;
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} className="border-b">
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                onClick={header.column.getToggleSortingHandler()}
                className="text-left p-2 cursor-pointer select-none font-medium"
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
                {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="border-b hover:bg-muted/50">
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="p-2">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Por que `"use client"` aqui, mas não no `page.tsx`:** `useReactTable` guarda estado de sorting em memória do componente (hook `useState`), então precisa rodar no browser. Isso é diferente de `mode` (que vive na URL) — o sorting é um estado de UI mais efêmero, que pode ficar local por enquanto (na Fase 3, quando `PainelSearchShell` entrar, você vai decidir se sorting também sobe pra URL ou fica local; adiantar isso agora seria complexidade sem necessidade).

### 4.3 `components/type-view/cards-view/CardsView.tsx`

```tsx
export function CardsView<T extends { id: string | number; title: string }>({ data }: { data: T[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">Nenhum item encontrado.</p>;
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      {data.map((item) => (
        <div key={item.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
          <strong>{item.title}</strong>
        </div>
      ))}
    </div>
  );
}
```

### 4.4 `components/type-view/TypeView.tsx`

```tsx
import type { ColumnDef } from "@tanstack/react-table";
import { ListView } from "./list-view/ListView";
import { CardsView } from "./cards-view/CardsView";

export type TypeViewMode = "list" | "cards";

export function TypeView<T extends { id: string | number; title: string }>({
  data,
  mode,
  columns,
}: {
  data: T[];
  mode: TypeViewMode;
  columns: ColumnDef<T>[];
}) {
  switch (mode) {
    case "list":
      return <ListView data={data} columns={columns} />;
    case "cards":
      return <CardsView data={data} />;
    default:
      // segurança de tipo: se um novo modo for adicionado ao type sem
      // atualizar esse switch, o TS vai reclamar aqui (exhaustiveness check)
      return mode satisfies never;
  }
}
```

**Detalhe de design que vale entender:** `mode satisfies never` no `default` é uma técnica de TypeScript chamada *exhaustiveness check*. Se no futuro você adicionar `"calendar"` ao tipo `TypeViewMode` mas esquecer de tratar no `switch`, o TypeScript vai dar erro de compilação bem nesse ponto — antes de virar bug em produção.

### 4.5 `components/type-view/ViewSwitcher.tsx`

```tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { TypeViewMode } from "./TypeView";

const VIEW_OPTIONS: { value: TypeViewMode; label: string }[] = [
  { value: "list", label: "Lista" },
  { value: "cards", label: "Cards" },
];

export function ViewSwitcher({ current }: { current: TypeViewMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(next: TypeViewMode) {
    const params = new URLSearchParams(searchParams);
    params.set("view", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-2">
      {VIEW_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => handleChange(option.value)}
          className={`px-3 py-1 rounded text-sm ${
            current === option.value ? "bg-black text-white" : "bg-gray-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

### 4.6 `app/(app)/favorites/page.tsx` — juntando tudo

```tsx
import { createDataProvider } from "@/lib/data-provider";
import { TypeView, type TypeViewMode } from "@/components/type-view/TypeView";
import { ViewSwitcher } from "@/components/type-view/ViewSwitcher";
import { favoriteColumns } from "@/components/type-view/list-view/columns";
import type { Favorite } from "@/types/favorite";

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const mode: TypeViewMode = view === "cards" ? "cards" : "list"; // default seguro

  const dataProvider = createDataProvider();
  const result = await dataProvider.search<Favorite>("favorites.list", {
    searchText: "",
    pagination: { pageIndex: 0, pageSize: 20 },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Favoritos</h1>
        <ViewSwitcher current={mode} />
      </div>

      <TypeView data={result.data} mode={mode} columns={favoriteColumns} />
    </div>
  );
}
```

**Por que `mode` é validado com um ternário (`view === "cards" ? "cards" : "list"`) em vez de um cast direto (`view as TypeViewMode`):** `searchParams` vem de fora (a URL pode ter qualquer coisa digitada por alguém, tipo `?view=xyz123`). Um `as` só engana o compilador, não protege em runtime. Essa validação garante que, mesmo com URL forjada, o app cai num modo válido em vez de quebrar.

---

## 5. Uso prático

### 5.1 Teste 1 — troca de modo via clique

Abra `/favorites`, clique no botão "Cards". Confirme:

- A URL muda pra `?view=cards`
- A tela troca pro grid de cards
- Dá refresh na página com `?view=cards` na URL — o modo cards deve persistir (prova de que o estado está na URL, não se perdeu)

### 5.2 Teste 2 — sorting no ListView

No modo lista, clique no header "Título". Confirme que a ordem muda e a seta (↑/↓) aparece. Clique de novo e confirme que inverte.

### 5.3 Teste 3 — URL forjada

Edita a URL manualmente pra `?view=alguma-coisa-invalida` e confirme que a página não quebra — deve cair no modo `"list"` por causa da validação da seção 4.6.

### 5.4 Teste 4 — estado vazio

Filtre (ou temporariamente force) o `dataProvider.search` a devolver um array vazio e confirme que aparece "Nenhum item encontrado." tanto no `ListView` quanto no `CardsView`, sem erro de renderização.

---

## 6. Checkpoint — perguntas que você precisa saber responder antes de ir pra Fase 3

1. Por que `mode` fica na URL e `sorting` (dentro do `ListView`) fica em `useState` local — qual critério decide onde cada tipo de estado deve morar?
2. O `TypeView` sabe que os dados vieram do `DataProvider`? Se a resposta for não, o que isso garante pra reutilização futura em outra feature?
3. Por que `ViewSwitcher` é `"use client"` mas `TypeView` não precisa ser?
4. O que `mode satisfies never` está protegendo, na prática? Tente imaginar o erro que o TypeScript mostraria se você adicionasse `"calendar"` ao tipo sem tratar no switch.
5. Se dois usuários abrirem `/favorites?view=cards` ao mesmo tempo, cada um vê um modo independente? Por que isso funciona corretamente sendo Server Component (dica: pense em como `searchParams` chega — por request, não por processo global).

Quando você conseguir responder essas 5 sem consultar o material, a Fase 2 está fechada e partimos pra Fase 3 (`RecordListHost` — unindo `TypeView` com `PainelSearchShell`).
