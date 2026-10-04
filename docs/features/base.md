# Do zero ao DetailShell — reconstruindo `favorites` passo a passo

Regra do plano: cada etapa deve ser testável sozinha, no navegador, antes de seguir pra próxima. Se uma etapa não "funcionar visualmente", pare e resolva ali — não acumule dúvida.

Crie uma pasta nova, separada do projeto principal, tipo `study-favorites-from-scratch`, com `npx create-next-app@latest`. Marque TypeScript = sim, App Router = sim, Tailwind = sim (o resto pode deixar padrão). Reconstruir num projeto limpo evita a ansiedade de "estar mexendo no projeto real".

---

# FASE 0 — Antes de tocar em React

Você não precisa ser expert nisso, só desenrolado o suficiente:

- **JavaScript**: `const/let`, arrow functions, destructuring (`const { a, b } = obj`), spread (`{ ...obj }`), array `.map()`/`.filter()`, `async/await`.
- **TypeScript básico**: `interface`, tipos primitivos, `?` pra opcional.

**Teste de prontidão:** você consegue ler este trecho sem travar?
```ts
interface User { id: string; name: string; }
const users: User[] = [{ id: '1', name: 'Ana' }];
const names = users.map((u) => u.name);
const { id, ...rest } = users[0];
```
Se sim, siga. Se travou em algo específico, resolve isso isoladamente antes (MDN é a melhor fonte pra JS puro: https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Guide).

---

# FASE 1 — BÁSICO: um componente, uma página, dados estáticos

### Etapa 1.1 — Primeira página
**Objetivo:** ter uma rota `/favorites` mostrando um título.
**Conhecimento necessário:** o que é um Server Component (todo componente no App Router é Server por padrão, sem nenhuma diretiva). O que é uma "rota" no App Router — pasta = segmento de URL, `page.tsx` = o conteúdo dessa rota.
**Faça:** crie `app/favorites/page.tsx`:
```tsx
export default function FavoritesPage() {
  return <h1>Meus Favoritos</h1>;
}
```
**Teste:** abra `localhost:3000/favorites` e veja o título.
**Leitura:** https://react.dev/learn/your-first-component e https://nextjs.org/docs/app/getting-started/layouts-and-pages

---

### Etapa 1.2 — Dado estático, sem componente próprio ainda
**Objetivo:** mostrar uma lista de favoritos, mas com o array direto dentro da página (sem buscar de lugar nenhum ainda).
**Conhecimento necessário:** `.map()` pra transformar array em elementos JSX, e por que cada item de lista precisa de uma prop `key`.
**Faça:**
```tsx
const favorites = [
  { id: '1', title: 'Google', url: 'https://google.com' },
  { id: '2', title: 'GitHub', url: 'https://github.com' },
];

export default function FavoritesPage() {
  return (
    <ul>
      {favorites.map((fav) => (
        <li key={fav.id}>{fav.title}</li>
      ))}
    </ul>
  );
}
```
**Teste:** os dois itens aparecem na tela. Remova o `key` de propósito e veja o warning no console do navegador — isso ensina por que ele existe.
**Leitura:** https://react.dev/learn/rendering-lists

---

### Etapa 1.3 — Extraindo o primeiro componente
**Objetivo:** separar o item da lista num componente próprio, recebendo dados via **props**.
**Conhecimento necessário:** o que é uma prop (um parâmetro de função, só isso), como tipar props com TypeScript.
**Faça:** crie `components/FavoriteItem.tsx`:
```tsx
interface FavoriteItemProps {
  title: string;
  url: string;
}

export function FavoriteItem({ title, url }: FavoriteItemProps) {
  return (
    <li>
      <a href={url} target="_blank">{title}</a>
    </li>
  );
}
```
Use em `page.tsx`:
```tsx
import { FavoriteItem } from '@/components/FavoriteItem';

// ...
<ul>
  {favorites.map((fav) => (
    <FavoriteItem key={fav.id} title={fav.title} url={fav.url} />
  ))}
</ul>
```
**Teste:** clicar no link abre em nova aba.
**Leitura:** https://react.dev/learn/passing-props-to-a-component

---

### Etapa 1.4 — Passando o objeto inteiro como prop (e criando o tipo compartilhado)
**Objetivo:** em vez de passar `title` e `url` soltos, passar o objeto `favorite` inteiro. Isso é o padrão que você vai usar pra sempre daqui em diante.
**Conhecimento necessário:** organizar tipos num arquivo compartilhado.
**Faça:** crie `types/favorite.ts`:
```ts
export interface Favorite {
  id: string;
  title: string;
  url: string;
}
```
Ajuste `FavoriteItem`:
```tsx
import { Favorite } from '@/types/favorite';

export function FavoriteItem({ favorite }: { favorite: Favorite }) {
  return (
    <li>
      <a href={favorite.url} target="_blank">{favorite.title}</a>
    </li>
  );
}
```
**Teste:** tudo continua funcionando igual — o objetivo aqui é só a organização, não uma mudança visual.

---

### Checkpoint da Fase 1
Você deveria conseguir explicar, com suas palavras: o que é uma prop, por que listas precisam de `key`, e a diferença entre passar valores soltos vs um objeto inteiro como prop.

---

# FASE 2 — BÁSICO/INTERMEDIÁRIO: dados vindo de fora (fetch) e Client Components

### Etapa 2.1 — Uma API fake local
**Objetivo:** ter algo real pra buscar, sem depender do backend do projeto principal ainda.
**Conhecimento necessário:** o que é uma Route Handler no Next (uma API dentro do próprio Next).
**Faça:** crie `app/api/favorites/route.ts`:
```ts
import { NextResponse } from 'next/server';

const favorites = [
  { id: '1', title: 'Google', url: 'https://google.com' },
  { id: '2', title: 'GitHub', url: 'https://github.com' },
];

export async function GET() {
  return NextResponse.json(favorites);
}
```
**Teste:** acesse `localhost:3000/api/favorites` direto no navegador e veja o JSON.
**Leitura:** https://nextjs.org/docs/app/building-your-application/routing/route-handlers

---

### Etapa 2.2 — Buscando no Server Component
**Objetivo:** a página busca os dados de verdade em vez do array fixo.
**Conhecimento necessário:** `async/await` dentro de um Server Component (só é possível porque ele roda no servidor — isso é a essência do SSR).
**Faça:**
```tsx
async function getFavorites(): Promise<Favorite[]> {
  const res = await fetch('http://localhost:3000/api/favorites', { cache: 'no-store' });
  return res.json();
}

export default async function FavoritesPage() {
  const favorites = await getFavorites();
  return (
    <ul>
      {favorites.map((fav) => (
        <FavoriteItem key={fav.id} favorite={fav} />
      ))}
    </ul>
  );
}
```
**Teste:** dê "view-source" na página (Ctrl+U) — o HTML já vem com os itens preenchidos, sem precisar de JavaScript rodar no navegador pra aparecerem. **Esse é o SSR acontecendo, veja com seus próprios olhos.**
**Leitura:** https://nextjs.org/docs/app/getting-started/fetching-data

---

### Etapa 2.3 — Primeiro Client Component: um botão que faz algo
**Objetivo:** entender por que e quando algo precisa de `'use client'`.
**Conhecimento necessário:** Server Component não pode ter `onClick`, `useState`, nada interativo — só Client Component pode.
**Faça:** crie `components/FavoriteToggleReadButton.tsx`:
```tsx
'use client';
import { useState } from 'react';

export function FavoriteToggleReadButton() {
  const [clicked, setClicked] = useState(false);

  return (
    <button onClick={() => setClicked(!clicked)}>
      {clicked ? '✅ Marcado' : 'Marcar'}
    </button>
  );
}
```
Coloque esse botão dentro de `FavoriteItem` (ele pode ser filho de um Server Component sem problema).
**Teste:** clique alterna o texto do botão sem recarregar a página.
**Reflexão escrita:** por que essa interação não poderia acontecer se `FavoriteItem` inteiro virasse Server Component? (porque perderia o `useState`/`onClick`).
**Leitura:** https://nextjs.org/docs/app/getting-started/server-and-client-components

---

### Checkpoint da Fase 2
Você deveria conseguir explicar: a diferença entre Server e Client Component numa frase cada, e por que o HTML de `favorites` já vem pronto no view-source.

---

# FASE 3 — INTERMEDIÁRIO: formulário controlado e criação (Create)

### Etapa 3.1 — Formulário controlado, sem salvar nada ainda
**Objetivo:** aprender `useState` controlando um input, puramente client-side.
**Conhecimento necessário:** "controlled input" — o valor do campo vive no estado do React, não no DOM.
**Faça:** crie `components/FavoriteCreateForm.tsx`:
```tsx
'use client';
import { useState } from 'react';

export function FavoriteCreateForm() {
  const [title, setTitle] = useState('');

  return (
    <div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
      <p>Você digitou: {title}</p>
    </div>
  );
}
```
**Teste:** o parágrafo abaixo do input atualiza em tempo real conforme você digita.
**Leitura:** https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable

---

### Etapa 3.2 — Enviando pra API com `fetch` no client
**Objetivo:** salvar de verdade, ainda do jeito "clássico" (sem Server Actions ainda — isso é proposital, pra você sentir a diferença depois).
**Conhecimento necessário:** `fetch` com método POST, `JSON.stringify`.
**Faça:** adicione o método POST na Route Handler:
```ts
// app/api/favorites/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  const newFavorite = { id: crypto.randomUUID(), ...body };
  favorites.push(newFavorite);
  return NextResponse.json(newFavorite, { status: 201 });
}
```
No form:
```tsx
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, url: 'https://exemplo.com' }),
  });
  setTitle('');
}

// no JSX:
<form onSubmit={handleSubmit}>
  <input value={title} onChange={(e) => setTitle(e.target.value)} />
  <button type="submit">Criar</button>
</form>
```
**Teste:** crie um favorito, depois recarregue a página `/favorites` manualmente (F5) e veja que ele apareceu na lista.
**Reflexão:** por que o item novo não aparece sozinho, sem F5? (porque o Server Component que busca a lista só roda de novo numa nova navegação/reload — isso motiva a etapa 3.3).

---

### Etapa 3.3 — Atualizando a lista sem F5: `router.refresh()`
**Objetivo:** primeira ponte entre Client e Server sem Server Actions ainda.
**Conhecimento necessário:** `useRouter` do `next/navigation`, e o que `router.refresh()` faz (re-executa os Server Components da rota atual, mantendo o estado client).
**Faça:**
```tsx
'use client';
import { useRouter } from 'next/navigation';
// ...
const router = useRouter();

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  await fetch('/api/favorites', { method: 'POST', /* ... */ });
  setTitle('');
  router.refresh();
}
```
**Teste:** crie um favorito e veja a lista atualizar sozinha, sem F5.
**Leitura:** https://nextjs.org/docs/app/api-reference/functions/use-router#userouter

---

### Checkpoint da Fase 3
Você deveria entender por que criar algo via `fetch` client-side não atualiza a UI sozinho, e o que `router.refresh()` resolve.

---

# FASE 4 — INTERMEDIÁRIO: Server Actions (o jeito certo, substituindo o fetch manual)

### Etapa 4.1 — Sua primeira Server Action
**Objetivo:** trocar o POST manual por uma função que roda no servidor, chamada diretamente do client, sem você escrever `fetch` nem `router.refresh()` manual.
**Conhecimento necessário:** diretiva `'use server'`, `revalidatePath`.
**Faça:** crie `actions/favorite.actions.ts`:
```ts
'use server';
import { revalidatePath } from 'next/cache';

// Por enquanto, mesmo array em memória do route handler não dá pra
// importar direto aqui num setup real (cada um roda isolado) — use
// fetch para a Route Handler, ou (melhor pra aprender) troque para
// chamar a mesma função de "banco de dados fake" compartilhada.
export async function createFavorite(formData: FormData) {
  const title = formData.get('title') as string;
  const url = formData.get('url') as string;

  await fetch('http://localhost:3000/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, url }),
  });

  revalidatePath('/favorites');
}
```
**Faça o form usar a action direto**, sem `useState`, sem `onSubmit` manual:
```tsx
import { createFavorite } from '@/actions/favorite.actions';

export function FavoriteCreateForm() {
  return (
    <form action={createFavorite}>
      <input name="title" placeholder="Título" />
      <input name="url" placeholder="URL" />
      <button type="submit">Criar</button>
    </form>
  );
}
```
Repare: **esse componente nem precisa mais de `'use client'`.** Formulários com Server Action funcionam mesmo sem JavaScript no client.
**Teste:** crie um favorito, veja a lista atualizar sozinha — e note que você não escreveu `fetch` nem `useState` nenhum dessa vez.
**Leitura:** https://nextjs.org/docs/app/getting-started/updating-data

---

### Etapa 4.2 — Feedback de estado com `useActionState`
**Objetivo:** mostrar "Salvando..." e mensagens de erro/sucesso.
**Conhecimento necessário:** `useActionState`, por que a action precisa mudar de assinatura pra aceitar `(prevState, formData)`.
**Faça:**
```ts
// actions/favorite.actions.ts
export interface ActionState { ok: boolean; message?: string }

export async function createFavorite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const title = formData.get('title') as string;
  if (!title) return { ok: false, message: 'Título obrigatório' };

  await fetch(/* ... */);
  revalidatePath('/favorites');
  return { ok: true, message: 'Criado com sucesso!' };
}
```
```tsx
'use client';
import { useActionState } from 'react';
import { createFavorite, ActionState } from '@/actions/favorite.actions';

const initialState: ActionState = { ok: false };

export function FavoriteCreateForm() {
  const [state, formAction, isPending] = useActionState(createFavorite, initialState);

  return (
    <form action={formAction}>
      <input name="title" />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Criar'}
      </button>
      {state.message && <p>{state.message}</p>}
    </form>
  );
}
```
**Teste:** tente criar sem título, veja a mensagem de erro; crie com título, veja "Criado com sucesso!".
**Leitura:** https://react.dev/reference/react/useActionState

---

### Checkpoint da Fase 4
Compare mentalmente as etapas 3.2/3.3 com 4.1/4.2 — você deveria conseguir listar pelo menos 3 coisas que Server Actions resolveram automaticamente que você tinha que fazer na mão antes.

---

# FASE 5 — INTERMEDIÁRIO: rota dinâmica, Update e Delete

### Etapa 5.1 — Rota dinâmica `[id]`
**Objetivo:** uma página de detalhe simples, sem nenhum Shell ainda — só provar que `[id]` funciona.
**Conhecimento necessário:** convenção de pasta `[id]`, `params` como Promise (Next 15+).
**Faça:** crie `app/favorites/[id]/page.tsx`:
```tsx
interface PageProps { params: Promise<{ id: string }> }

export default async function FavoriteDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <h1>Detalhe do favorito {id}</h1>;
}
```
Adicione `<Link href={`/favorites/${fav.id}`}>` em cada item da lista.
**Teste:** clicar num item navega pra `/favorites/1` e mostra o id certo.
**Leitura:** https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes

---

### Etapa 5.2 — Buscando o item específico
**Objetivo:** a página de detalhe mostra os dados reais daquele id.
**Faça:** adicione ao Route Handler um `GET` por id em `app/api/favorites/[id]/route.ts`, e busque na página de detalhe como fez na etapa 2.2.
**Teste:** cada id mostra título/url diferentes.

---

### Etapa 5.3 — Update com Server Action + `.bind`
**Objetivo:** editar o favorito, entendendo como passar o `id` pra dentro de uma Server Action genérica.
**Conhecimento necessário:** `.bind(null, id)`.
**Faça:**
```ts
export async function updateFavorite(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const title = formData.get('title') as string;
  await fetch(`http://localhost:3000/api/favorites/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  revalidatePath(`/favorites/${id}`);
  return { ok: true, message: 'Atualizado!' };
}
```
```tsx
const [state, formAction] = useActionState(updateFavorite.bind(null, favorite.id), initialState);
```
**Teste:** editar o título na página de detalhe e ver a mudança persistir após navegar pra lista e voltar.
Adicione `PATCH` no Route Handler `[id]/route.ts` pra isso funcionar de verdade.

---

### Etapa 5.4 — Delete
**Objetivo:** fechar o CRUD.
**Faça:** action `deleteFavorite(id)` com `redirect('/favorites')` depois de deletar (aprenda `redirect` do `next/navigation`), e método `DELETE` no Route Handler.
**Teste:** deletar na tela de detalhe volta pra lista e o item já não aparece mais.
**Leitura:** https://nextjs.org/docs/app/api-reference/functions/redirect

---

### Checkpoint da Fase 5
Você reconstruiu sozinho o CRUD completo que `favorites` já tinha no projeto original — mas dessa vez sabendo o porquê de cada peça. Esse é o ponto em que o roteiro anterior começava. Se chegou até aqui com conforto, o salto pra arquitetura fica muito menor.

---

# FASE 6 — AVANÇADO: URL como estado (base do `PainelSearchShell` / `TypeView`)

### Etapa 6.1 — Ler searchParams
**Objetivo:** a página de lista aceita `?search=`.
**Conhecimento necessário:** `searchParams` como prop da page (também Promise no Next 15+).
**Faça:** ajuste `getFavorites` pra filtrar, e a página pra ler `searchParams`.
**Teste:** acesse manualmente `/favorites?search=git` na barra de endereço e veja a lista filtrada.

### Etapa 6.2 — Input que escreve na URL
**Objetivo:** um Client Component que usa `useRouter` + `useSearchParams` pra atualizar `?search=` sem `useState` guardando o resultado.
**Teste:** digitar no input muda a URL (observe na barra de endereço) e a lista reage.

### Etapa 6.3 — Toggle de view (`?view=`)
**Objetivo:** duas formas de mostrar a lista (ex: lista simples vs cards), trocadas por botão, guardadas na URL.
**Teste:** trocar de view, dar F5, ver que a view escolhida se mantém.

Isso é exatamente o miolo do `TypeView` — só que agora construído por você, peça por peça, entendendo cada linha.

---

# FASE 7 — AVANÇADO: Suspense e streaming (base do `DetailShell`)

### Etapa 7.1 — Sentir o problema
**Objetivo:** adicionar um delay artificial no fetch e ver a página inteira travar até carregar.
**Faça:** `await new Promise(r => setTimeout(r, 2000))` dentro do `getFavorites`.
**Teste:** veja a tela em branco por 2s.

### Etapa 7.2 — Resolver com `<Suspense>`
**Objetivo:** envolver só a lista (não a página toda) num Suspense, com um fallback de loading.
**Teste:** algum outro elemento estático da página (um título fixo, por exemplo) aparece na hora, e só a lista demora, com um "Carregando..." no lugar dela.
**Leitura:** https://react.dev/reference/react/Suspense

### Etapa 7.3 — Dois blocos independentes
**Objetivo:** simular a estrutura do `DetailShell` — a página de detalhe tem um bloco "form" (rápido) e um bloco "metadados" (lento), cada um em seu próprio Suspense.
**Teste:** o form aparece na hora, os metadados aparecem depois, sem travar o form.

---

# FASE 8 — AVANÇADO: Autosave com `useOptimistic`

### Etapa 8.1 — Salvar um campo sozinho, sem botão
**Objetivo:** ao invés de um form com botão "Salvar", o campo salva sozinho ao perder o foco (`onBlur`) — o jeito mais simples de autosave antes de partir pra debounce.
**Conhecimento necessário:** chamar uma Server Action diretamente de um handler (não via `form action`), com `useTransition` pra saber quando está pendente.
**Teste:** editar o campo, clicar fora, ver "Salvando..." e depois "Salvo".

### Etapa 8.2 — Debounce enquanto digita
**Objetivo:** ao invés de esperar o blur, salvar 600ms depois que o usuário parar de digitar.
**Conhecimento necessário:** `setTimeout`/`clearTimeout` dentro de um handler controlado, ou a lib `use-debounce`.
**Teste:** digitar rápido não dispara várias chamadas — só uma, depois de parar.

### Etapa 8.3 — Atualização otimista
**Objetivo:** o campo muda na tela instantaneamente, mesmo antes do servidor confirmar.
**Conhecimento necessário:** `useOptimistic`.
**Teste:** simule um erro proposital na Server Action (retorne erro sempre) e veja o campo reverter pro valor antigo.
**Leitura:** https://react.dev/reference/react/useOptimistic

---

# FASE 9 — AVANÇADO: generalizando (o que vira `DetailShell<T>` de verdade)

Só chegue aqui depois de fazer as fases 1 a 8 com `favorites` reconstruído do zero e funcionando de ponta a ponta.

### Etapa 9.1 — Extrair o layout de detalhe genérico
Pegue a página de detalhe da Fase 7.3 e extraia a estrutura visual (duas colunas: form + lateral) pra um componente `DetailShell` que recebe `form` e `sideShell` como props — sem saber nada sobre `Favorite`.

### Etapa 9.2 — Generics
Torne um componente de lista genérico com `<T extends { id: string }>`, seguindo o mesmo exercício do roteiro anterior (módulo 6, exercício 6.1) — agora com o contexto todo já internalizado.

### Etapa 9.3 — Juntar tudo
Volte para o documento **"implementação oficial"** que já te entreguei. Releia com calma — ele vai fazer sentido de um jeito completamente diferente agora que você construiu cada peça sozinho, sem pular etapas.

---

## Ritmo sugerido

Não existe prazo certo — mas como referência: as Fases 1–2 são "um fim de tarde" cada, 3–5 podem levar 2-3 dias cada se você for com calma, e 6–8 são as mais densas, vale uma semana cada sem pressa. A Fase 9 só faz sentido depois de tudo isso estar confortável, não decorado.

Sempre que travar numa etapa específica, me chama só com aquela etapa — não precisa esperar terminar a fase inteira.