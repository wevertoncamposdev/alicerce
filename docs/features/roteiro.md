# Roteiro de estudo — de `favorites` até `TypeView` / `DetailShell`

Todos os exercícios usam o repositório `study` como sandbox. Faça uma branch separada (`git checkout -b estudo/arquitetura`) pra poder quebrar coisas sem medo. A ordem importa: cada módulo depende do anterior.

---

## Módulo 1 — Props e fluxo de dados (base)

**Leitura antes de começar:**
- https://react.dev/learn/passing-props-to-a-component
- https://react.dev/learn/sharing-state-between-components

**Exercício 1.1 — Ler o fluxo existente**
Abra `favorites/page.tsx` → `FavoritesList.tsx` → `FavoritesEditForm.tsx` e, sem rodar o código, desenhe no papel (ou num arquivo `.md`) o diagrama de props: quem manda o quê pra quem, e quem manda callback de volta. Confira depois rodando o projeto e observando o React DevTools (aba Components) pra ver a árvore real.

**Exercício 1.2 — Quebrar e consertar**
Remova a prop `favorites` de `FavoritesList` e tente fazer a lista funcionar buscando os dados com `useEffect` + `fetch` dentro do próprio Client Component. Depois responda por escrito: o que você perdeu ao fazer isso? (loading state, token exposto, waterfall de requests). Reverta.

**Exercício 1.3 — Lifting state up**
Hoje `editingId` mora em `FavoritesList`. Imagine que você precisa que o `FavoritesCreateForm` (que é irmão de `FavoritesList`, ambos filhos de `page.tsx`) saiba se algum item está em edição, pra desabilitar o botão de criar. Implemente isso subindo o estado pra `page.tsx`. Como `page.tsx` é Server Component, você vai esbarrar num problema — anote qual foi e por quê (dica: Server Component não pode ter `useState`).

**Exercício 1.4 — Resolver com Client wrapper**
Resolva o problema do 1.3 criando um Client Component wrapper que envolve `FavoritesCreateForm` + `FavoritesList` e guarda o estado compartilhado, enquanto `page.tsx` continua Server Component só fazendo o fetch. Esse padrão ("Server Component busca, passa pra um Client wrapper que orquestra o estado entre os filhos") é o que você vai usar dentro do `DetailShell`.

---

## Módulo 2 — Server vs Client Components na prática

**Leitura antes de começar:**
- https://nextjs.org/docs/app/getting-started/server-and-client-components

**Exercício 2.1 — Caçar as diretivas**
Liste todo arquivo em `features/favorites/` e classifique cada um como Server ou Client Component, e escreva o motivo em uma frase (ex: "usa `useState` → precisa ser Client").

**Exercício 2.2 — Interleaving (o padrão children)**
Crie um componente `FavoritesPageShell` (Client Component) que recebe `children` e renderiza um wrapper visual (ex: uma borda, um título fixo). Envolva o `<FavoritesList favorites={favorites} />` do `page.tsx` com esse shell, passando a lista como `children` em vez de import direto dentro do Client Component. Isso prova na prática que Client Component pode "hospedar" conteúdo vindo de Server Component sem quebrar a fronteira.

**Exercício 2.3 — Onde o fetch deveria estar**
Pegue `getFavorites()` em `favorites.queries.ts` e tente movê-lo pra dentro de `FavoritesList.tsx` (que é Client). Você vai precisar transformar em `useEffect` + fetch client-side, ou usar uma API route. Depois de fazer funcionar, escreva 3 desvantagens dessa versão comparada à original.

---

## Módulo 3 — URL como estado (a base do PainelSearchShell e TypeView)

**Leitura antes de começar:**
- https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional
- https://nextjs.org/docs/app/api-reference/components/link#prefetch

**Exercício 3.1 — Filtro simples via searchParams**
Em `favorites/page.tsx`, adicione suporte a `?search=termo`. O `page.tsx` deve ler `searchParams`, e `getFavorites` deve aceitar um parâmetro de busca opcional que filtra no backend (ou, se o backend não suportar ainda, filtre no array retornado, mas comente no código que isso é temporário até o backend suportar).

**Exercício 3.2 — Um input que atualiza a URL**
Crie um `FavoritesSearchInput` (Client Component) com um `<input>` que, ao digitar (com debounce de ~400ms), chama `router.push` atualizando `?search=`. Sem `useState` pra guardar os favoritos filtrados — a UI deve reagir só porque a URL mudou e o Server Component re-renderizou.

**Exercício 3.3 — Toggle de "view"**
Adicione `?view=list` ou `?view=cards` na mesma página. Crie dois componentes de renderização (`FavoritesListView` e `FavoritesCardsView`) e faça `page.tsx` escolher qual montar com base em `searchParams.view`. Isso é o `TypeView` em miniatura — depois de fazer isso funcionar com 2 views, você já entende o suficiente pra generalizar pra N views (timeline, gantt, calendar).

**Reflexão escrita (obrigatória):** compare o exercício 3.3 com uma versão que usaria `useState('list')` num Client Component pra controlar a view. Liste o que se perde fazendo com `useState` (não sobrevive a refresh, não é linkável, força tudo a virar Client Component).

---

## Módulo 4 — Server Actions, useActionState e o caminho até o AutoSave

**Leitura antes de começar:**
- https://react.dev/reference/react/useActionState
- https://react.dev/reference/react/useTransition
- https://react.dev/reference/react/useOptimistic
- https://nextjs.org/docs/app/getting-started/updating-data

**Exercício 4.1 — Entender o bind**
Em `FavoritesEditForm.tsx`, remova temporariamente o `.bind(null, favorite.id)` e tente entender (sem rodar) por que o `updateFavorite` pararia de funcionar — qual argumento ele esperaria receber no lugar do `id`. Depois restaure e escreva, com suas palavras, o que `.bind` está fazendo ali.

**Exercício 4.2 — Seu primeiro campo com autosave**
Crie um novo componente `FavoritesTitleAutosave` que renderiza só o campo `title` (fora do form de create/edit existente) e salva automaticamente 800ms depois que o usuário para de digitar, sem botão de submit. Use `useTransition` pra mostrar um indicador "salvando..." e chame a Server Action `updateFavorite` diretamente (não via `useActionState`, já que não há submit de formulário aqui).

**Exercício 4.3 — Otimismo com useOptimistic**
Evolua o exercício 4.2: ao digitar, o campo deve refletir o novo valor na tela *imediatamente* (antes da resposta do servidor), e reverter se a Server Action falhar. Implemente com `useOptimistic`. Esse exato padrão é o que o `FormView` do `DetailShell` vai usar pra cada campo.

**Exercício 4.4 — Revalidação granular**
Troque `revalidatePath('/favorites')` por `revalidateTag` nas actions. Crie a tag no fetch (`fetch(url, { next: { tags: [`favorite:${id}`] } })` se seu `apiServer` permitir, ou documente como adaptaria `apiServer` pra suportar tags). Escreva por que isso importa quando o `DetailShell` tiver Form + SideShell + RelationShell independentes.

---

## Módulo 5 — Suspense e streaming (a espinha dorsal do DetailShell)

**Leitura antes de começar:**
- https://react.dev/reference/react/Suspense
- https://nextjs.org/docs/app/api-reference/file-conventions/loading

**Exercício 5.1 — Simular latência**
Em `favorites.queries.ts`, adicione um `await new Promise(r => setTimeout(r, 2000))` artificial dentro de `getFavorites`. Rode a página e observe: a página inteira fica em branco por 2s até tudo aparecer de uma vez. Esse é o comportamento que você quer evitar no `DetailShell`.

**Exercício 5.2 — Quebrar em Suspense boundaries**
Crie dois componentes async fictícios: `FavoritesStats` (que simula buscar "total de favoritos" com 3s de delay) e coloque junto de `FavoritesList` na mesma página, cada um dentro do seu próprio `<Suspense fallback={<Skeleton />}>`. Confirme que agora a lista aparece rápido enquanto o stats ainda carrega — essa é a mecânica exata que separa `FormView`, `SideShell` e `RelationShell` no `DetailShell` real.

**Exercício 5.3 — loading.tsx da rota**
Crie um `favorites/loading.tsx` e entenda a diferença dele pra um `<Suspense>` manual dentro da página (o `loading.tsx` cobre a navegação inteira da rota; o `Suspense` manual cobre um pedaço específico da árvore, permitindo granularidade).

---

## Módulo 6 — Generics e composição (preparação pro `DetailShell<T>`)

**Leitura antes de começar:**
- https://react-typescript-cheatsheet.netlify.app/docs/basic/setup
- https://www.patterns.dev/react (seção Compound Components)

**Exercício 6.1 — Generalizar o tipo**
Pegue `FavoriteEntity` e crie uma interface mínima `WithId { id: string }`. Reescreva a assinatura de `FavoritesList` pra `function FavoritesList<T extends WithId>({ items, renderItem }: { items: T[]; renderItem: (item: T) => React.ReactNode })`. Adapte o `page.tsx` pra passar uma função `renderItem` que desenha a linha do favorito. Isso prova que a lista pode virar genérica sem perder nada.

**Exercício 6.2 — Slots via children**
Crie um componente `TwoColumnShell` que recebe `main` e `aside` como props (`React.ReactNode`), e renderiza um grid de duas colunas. Use-o pra montar uma versão simplificada da tela de `DetailShell` (Form na coluna principal, SideShell na lateral), usando dados fake de `favorites` como conteúdo. Esse é literalmente o esqueleto do `DetailShell` real, sem tipos ainda genéricos.

**Exercício 6.3 (síntese final)** — Junte tudo: crie `app/(app)/favorites/[id]/page.tsx` como um `DetailShell` de verdade pra `favorites` — Server Component que busca o favorito pelo `id`, com `<Suspense>` separando um "FormView" (o autosave do módulo 4) de um "SideShell" fake (mostra `createdAt`) e um "RelationShell" fake (lista vazia, só a estrutura de abas). Isso fecha o ciclo: você terá construído, peça por peça, exatamente a arquitetura que desenhamos, usando a feature mais simples do projeto como prova de conceito.

---

## Checklist de domínio (autoavaliação)

Antes de partir pro `DetailShell<T>` genérico de verdade, você deveria conseguir responder sem consultar a documentação:

- [ ] Por que `FavoritesList` não pode fazer seu próprio fetch e continuar recebendo dados via prop ao mesmo tempo?
- [ ] Por que um filtro de busca deveria estar na URL e não em `useState`, nessa arquitetura?
- [ ] Qual a diferença prática entre `revalidatePath` e `revalidateTag` pro caso do `DetailShell`?
- [ ] Por que `useOptimistic` existe — o que ele resolve que `useState` sozinho não resolve?
- [ ] Por que múltiplos `<Suspense>` independentes são melhores que um único `await` no topo da página, no contexto do `DetailShell`?
- [ ] Como um Client Component consegue "hospedar" um Server Component sem violar a regra de que Client não importa Server diretamente?

Quando essas seis respostas saírem com naturalidade, você está pronto pra desenhar o contrato de tipos do `DetailShell<T>` e do `TypeView<T>` em cima de uma base sólida — não decorada.