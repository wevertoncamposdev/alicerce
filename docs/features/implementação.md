# Implementação oficial — TypeView / DetailShell

Este documento é o padrão de referência para toda nova feature do projeto. A feature `favorites` é usada como caso de aplicação real ao longo do texto. Sempre que uma feature nova for criada, ela deve seguir exatamente esta estrutura.

---

## 0. Estrutura de pastas por feature

```
features/[feature]/
  [feature].types.ts        ← Entity, Create/Update payloads, ActionState
  [feature].constants.ts     ← INITIAL_STATE, colunas da tabela, views suportadas
  server/
    [feature].queries.ts     ← fetch server-only (já existe em favorites)
  actions/
    [feature].actions.ts     ← Server Actions (create/update/delete/patchField)
  components/
    [Feature]TypeView.tsx        ← monta o TypeView com as views disponíveis
    [Feature]Table.tsx           ← view "list", usa TanStack Table
    [Feature]SearchShell.tsx     ← PainelSearchShell específico da feature
    [Feature]DetailShell.tsx     ← monta FormView + SideShell + RelationShell
    [Feature]FormView.tsx        ← formulário com autosave

app/(app)/[feature]/
  layout.tsx    ← breadcrumb
  page.tsx      ← Tela 1 (List)
  [id]/
    page.tsx    ← Tela 2 (DetailShell)
```

---

## 1. Contratos de tipos genéricos (`components/shells/shell.types.ts`)

Base de tudo. Toda entity do sistema precisa satisfazer `WithId`.

```ts
// components/shells/shell.types.ts
export interface WithId {
  id: string;
}

export interface ViewDefinition<T extends WithId> {
  key: string;                          // "list" | "cards" | "gantt" | "calendar"
  label: string;
  render: (items: T[]) => React.ReactNode;
}

export interface DetailShellSlots {
  form: React.ReactNode;
  sideShell?: React.ReactNode;
  relationShell?: React.ReactNode;
}
```

---

## 2. `TypeView<T>` — components/TypeView/TypeView.tsx

O `TypeView` não sabe renderizar nada sozinho — ele só decide, com base na URL, qual view da lista de `views` recebida deve ser exibida. Isso mantém a troca de view em SSR (`searchParams`), como decidimos no módulo 3 do roteiro de estudo.

```tsx
// components/TypeView/TypeView.tsx
import { ViewDefinition, WithId } from '../shells/shell.types';

interface TypeViewProps<T extends WithId> {
  items: T[];
  views: ViewDefinition<T>[];
  activeView: string;
}

export function TypeView<T extends WithId>({ items, views, activeView }: TypeViewProps<T>) {
  const current = views.find((v) => v.key === activeView) ?? views[0];

  if (!current) {
    throw new Error('TypeView: nenhuma view configurada para esta feature.');
  }

  return <>{current.render(items)}</>;
}
```

```tsx
// components/TypeView/TypeViewToggle.tsx
'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ViewDefinition, WithId } from '../shells/shell.types';

interface TypeViewToggleProps<T extends WithId> {
  views: ViewDefinition<T>[];
  activeView: string;
}

export function TypeViewToggle<T extends WithId>({ views, activeView }: TypeViewToggleProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setView(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 rounded-md border p-1">
      {views.map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => setView(v.key)}
          className={`px-3 py-1 text-sm rounded ${
            v.key === activeView ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
```

### Aplicando em `favorites`

```tsx
// features/favorites/components/FavoritesTypeView.tsx
import { ViewDefinition } from '@/components/shells/shell.types';
import { FavoriteEntity } from '../favorite.types';
import { FavoritesList } from './FavoritesList';
import { FavoritesCards } from './FavoritesCards'; // nova view, mesmo padrão

export const FAVORITES_VIEWS: ViewDefinition<FavoriteEntity>[] = [
  { key: 'list', label: 'Lista', render: (items) => <FavoritesList favorites={items} /> },
  { key: 'cards', label: 'Cards', render: (items) => <FavoritesCards favorites={items} /> },
];
```

```tsx
// app/(app)/favorites/page.tsx
import { getFavorites } from '@/features/favorites/server/favorites.queries';
import { FAVORITES_VIEWS } from '@/features/favorites/components/FavoritesTypeView';
import { TypeView } from '@/components/TypeView/TypeView';
import { TypeViewToggle } from '@/components/TypeView/TypeViewToggle';
import { FavoritesSearchShell } from '@/features/favorites/components/FavoritesSearchShell';

interface PageProps {
  searchParams: Promise<{ view?: string; search?: string }>;
}

export default async function FavoritesPage({ searchParams }: PageProps) {
  const { view = 'list', search } = await searchParams;
  const favorites = await getFavorites({ search });

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <FavoritesSearchShell />
        <TypeViewToggle views={FAVORITES_VIEWS} activeView={view} />
      </div>

      <TypeView items={favorites} views={FAVORITES_VIEWS} activeView={view} />
    </div>
  );
}
```

`getFavorites` precisa aceitar o filtro:

```ts
// features/favorites/server/favorites.queries.ts
export async function getFavorites(params?: { search?: string }): Promise<FavoriteEntity[]> {
  const query = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
  return apiServer.get<FavoriteEntity[]>(`favorites${query}`);
}
```

---

## 3. `PainelSearchShell` — features/favorites/components/FavoritesSearchShell.tsx

Só escreve na URL. Não guarda estado de resultado.

```tsx
'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition, useState } from 'react';
import { Input } from '@/components/ui/input';

export function FavoritesSearchShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('search') ?? '');
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    setValue(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set('search', next);
    else params.delete('search');

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <Input
      placeholder="Buscar favoritos..."
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      className="max-w-xs"
    />
  );
}
```

> Para debounce real de digitação, envolva `handleChange` com um `useDebouncedCallback` (biblioteca `use-debounce`), evitando um `push` por tecla digitada.

---

## 4. `DetailShell` genérico — components/shells/DetailShell.tsx

Puramente estrutural. Não sabe nada sobre `favorites`, `users` etc. Recebe os três blocos prontos via props.

```tsx
// components/shells/DetailShell.tsx
import { DetailShellSlots } from './shell.types';

export function DetailShell({ form, sideShell, relationShell }: DetailShellSlots) {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>{form}</div>
        {sideShell ? <aside className="border rounded-lg p-4">{sideShell}</aside> : null}
      </div>

      {relationShell ? <div className="border rounded-lg p-4">{relationShell}</div> : null}
    </div>
  );
}
```

---

## 5. `FormView` com autosave — features/favorites/components/FavoritesFormView.tsx

Aqui entra `useOptimistic`. A Server Action `patchFavoriteField` salva um campo por vez.

```ts
// features/favorites/actions/favorites.actions.ts (adição)
'use server';

export async function patchFavoriteField(
  id: string,
  field: 'title' | 'url',
  value: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiServer.patch(`favorites/${id}`, { [field]: value });
    revalidateTag(`favorite:${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
```

```tsx
// features/favorites/components/FavoritesFormView.tsx
'use client';
import { useOptimistic, useTransition, useRef } from 'react';
import { patchFavoriteField } from '../actions/favorites.actions';
import { FavoriteEntity } from '../favorite.types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FavoritesFormViewProps {
  favorite: FavoriteEntity;
}

export function FavoritesFormView({ favorite }: FavoritesFormViewProps) {
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(favorite);
  const [isPending, startTransition] = useTransition();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function handleFieldChange(field: 'title' | 'url', value: string) {
    setOptimisticFavorite((prev) => ({ ...prev, [field]: value }));

    clearTimeout(timers.current[field]);
    timers.current[field] = setTimeout(() => {
      startTransition(async () => {
        const result = await patchFavoriteField(favorite.id, field, value);
        if (!result.ok) {
          // useOptimistic reverte sozinho ao fim da transition se o estado
          // "real" (prop favorite) não tiver mudado — aqui você pode
          // adicionar um toast de erro.
        }
      });
    }, 600);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Detalhes</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Salvando...' : 'Salvo'}
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          defaultValue={optimisticFavorite.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          defaultValue={optimisticFavorite.url}
          onChange={(e) => handleFieldChange('url', e.target.value)}
        />
      </div>
    </div>
  );
}
```

---

## 6. `SideShell` — features/favorites/components/FavoritesSideShell.tsx

Server Component, busca metadados de forma independente (pode ser lento sem travar o form).

```tsx
// features/favorites/components/FavoritesSideShell.tsx
import { FavoriteEntity } from '../favorite.types';

interface FavoritesSideShellProps {
  favorite: FavoriteEntity;
}

export async function FavoritesSideShell({ favorite }: FavoritesSideShellProps) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-muted-foreground">Criado em</p>
        <p>{new Date(favorite.createdAt).toLocaleString('pt-BR')}</p>
      </div>
      <div>
        <p className="text-muted-foreground">ID</p>
        <p className="font-mono text-xs break-all">{favorite.id}</p>
      </div>
      {/* Tags, audit e notes entram aqui como sub-componentes async
          independentes, cada um com seu próprio <Suspense> se necessário */}
    </div>
  );
}
```

---

## 7. `RelationShell` — components/shells/RelationShell.tsx

Genérico, com abas. Cada aba é preenchida pela feature com uma lista de itens relacionados que já vêm com link pronto pro `DetailShell` deles.

```ts
// components/shells/shell.types.ts (adição)
export interface RelationTab {
  key: string;
  label: string;
  render: () => React.ReactNode;
}
```

```tsx
// components/shells/RelationShell.tsx
'use client';
import { useState } from 'react';
import { RelationTab } from './shell.types';

interface RelationShellProps {
  tabs: RelationTab[];
}

export function RelationShell({ tabs }: RelationShellProps) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active);

  return (
    <div>
      <div className="flex gap-2 border-b mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-2 text-sm border-b-2 ${
              t.key === active ? 'border-primary font-medium' : 'border-transparent text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {current?.render()}
    </div>
  );
}
```

Uso dentro da feature (aqui `favorites` teria uma relação fictícia com `tags`, por exemplo):

```tsx
// features/favorites/components/FavoritesRelationShell.tsx
import Link from 'next/link';
import { RelationShell } from '@/components/shells/RelationShell';

export function FavoritesRelationShell({ favoriteId }: { favoriteId: string }) {
  return (
    <RelationShell
      tabs={[
        {
          key: 'tags',
          label: 'Tags',
          render: () => (
            <ul className="space-y-1 text-sm">
              {/* cada item relacionado, quando existir, é um link recursivo: */}
              <li>
                <Link href={`/tags/tag-id-exemplo`} className="text-blue-500 hover:underline">
                  Exemplo de tag relacionada
                </Link>
              </li>
            </ul>
          ),
        },
      ]}
    />
  );
}
```

---

## 8. Montando a Tela 2 completa — `app/(app)/favorites/[id]/page.tsx`

Cada bloco em seu próprio `<Suspense>`, conforme o módulo 5 do roteiro de estudo.

```tsx
// app/(app)/favorites/[id]/page.tsx
import { Suspense } from 'react';
import { getFavoriteById } from '@/features/favorites/server/favorites.queries';
import { DetailShell } from '@/components/shells/DetailShell';
import { FavoritesFormView } from '@/features/favorites/components/FavoritesFormView';
import { FavoritesSideShell } from '@/features/favorites/components/FavoritesSideShell';
import { FavoritesRelationShell } from '@/features/favorites/components/FavoritesRelationShell';

interface FavoriteDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FavoriteDetailPage({ params }: FavoriteDetailPageProps) {
  const { id } = await params;
  const favorite = await getFavoriteById(id);

  return (
    <DetailShell
      form={<FavoritesFormView favorite={favorite} />}
      sideShell={
        <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando metadados...</div>}>
          <FavoritesSideShell favorite={favorite} />
        </Suspense>
      }
      relationShell={
        <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando relações...</div>}>
          <FavoritesRelationShell favoriteId={favorite.id} />
        </Suspense>
      }
    />
  );
}
```

Falta o `getFavoriteById`:

```ts
// features/favorites/server/favorites.queries.ts (adição)
export async function getFavoriteById(id: string): Promise<FavoriteEntity> {
  return apiServer.get<FavoriteEntity>(`favorites/${id}`, {
    next: { tags: [`favorite:${id}`] },
  });
}
```

---

## 9. Checklist para criar uma feature nova seguindo este padrão

1. Copiar `features/_template` para `features/[nome]`.
2. Definir `[Nome]Entity` em `[nome].types.ts` (deve satisfazer `WithId`).
3. Implementar `getAll` e `getById` em `server/[nome].queries.ts`, aceitando `search` e tags de cache.
4. Implementar Server Actions: `create`, `update`, `delete`, `patchField` em `actions/[nome].actions.ts`.
5. Criar `[Nome]TypeView.tsx` com pelo menos a view `list` (as demais views podem ser adicionadas depois, sem alterar a página).
6. Criar `[Nome]SearchShell.tsx` reaproveitando o padrão de `FavoritesSearchShell`.
7. Criar `page.tsx` da Tela 1 seguindo o modelo da seção 2.
8. Criar `[Nome]FormView.tsx` com autosave seguindo o modelo da seção 5.
9. Criar `[Nome]SideShell.tsx` e `[Nome]RelationShell.tsx` (podem começar vazios/fake e evoluir depois).
10. Criar `[id]/page.tsx` da Tela 2 seguindo o modelo da seção 8.

A partir daqui, toda feature nova segue exatamente esses 10 passos — é isso que garante a experiência "familiar" entre as telas que você descreveu, sem o usuário precisar decorar caminhos diferentes por funcionalidade.