# Nextjs Sênior

Perfeito, isso facilita bastante — porque seu projeto já tem um exemplo bem claro (e bem comum) do "jeito errado por omissão" de fazer data fetching em Next.js. Vou usar `useUsers.ts` + `app/main/users/page.tsx` como caso de estudo, porque ali dá pra ver o problema com clareza.

## O que seu código faz hoje

Olhando `UsersPage`:

```tsx
"use client";
...
export default function UsersPage() {
  const { users, loading, ... } = useUsers();
```

E dentro de `useUsers`:

```tsx
useEffect(() => {
  void loadUsers();
}, [loadUsers]);
```

Isso é **React puro**, rodando dentro do Next.js — não é "o jeito Next.js" de buscar dados. É o padrão clássico de SPA (Create React App / Vite): componente client, `useEffect` dispara fetch, `useState` guarda loading/dado/erro. Funciona, mas você está pagando o preço do Next.js (build, SSR, etc.) sem usar nenhum dos benefícios dele.

## O conceito central que está faltando: onde o código roda

No App Router, todo componente dentro de `app/` é um **Server Component por padrão**. Isso significa que ele roda **no servidor**, durante a renderização — não no navegador. Só vira Client Component (roda no browser, pode usar `useState`/`useEffect`/eventos) quando você escreve `"use client"` no topo do arquivo, como sua `UsersPage` faz.

A consequência prática:

| | Server Component | Client Component |
| | | |
| Onde roda | No servidor (build ou request) | No navegador |
| Pode usar `useState`/`useEffect` | Não | Sim |
| Pode ser `async` e usar `await fetch()` direto no componente | Sim | Não |
| Cache automático de `fetch()` | Sim (é o Next.js fazendo isso) | Não (fetch de browser, cru) |
| Bundle enviado ao cliente | Zero (não vai JS pro browser) | Vai todo o componente + libs |

O Next.js foi desenhado para você buscar dados **dentro de Server Components**, com `await fetch(...)` direto no corpo do componente — sem `useEffect`, sem `useState` de loading. O próprio framework cuida de cache, dedupe de requisições repetidas e revalidação. É um modelo bem diferente do que você conhece do React "tradicional", e é exatamente por isso que trava tanta gente backend: parece "renderizar no servidor tipo PHP/Rails", só que com componentes React.

## A pegadinha real do seu projeto (isso é importante)

Seu `AuthContext` guarda o token em `localStorage`:

```ts
localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
```

`localStorage` só existe no navegador. Um Server Component, rodando no servidor, **não tem acesso a ele**. Ou seja: hoje, arquiteturalmente, é *impossível* buscar `/main/users` como Server Component sem mudar como o token é armazenado (normalmente isso migra para **cookies httpOnly**, que o servidor consegue ler).

Isso não é um detalhe chato — é o cerne do aprendizado. Next.js data fetching "de verdade" pressupõe que o servidor consiga se autenticar na sua API. Com token em localStorage, você está preso ao modelo client-side, que é exatamente o que seu código faz hoje. Faz sentido o resultado ter saído assim.

## Como vamos refatorar aos poucos

Sugiro esta ordem, cada passo é uma sessão de estudo:

1. **Migrar o token de `localStorage` para cookie** (usando `Route Handler` do Next para setar cookie httpOnly no login). Esse é o pré-requisito de tudo — sem isso, Server Components não conseguem se autenticar.
2. **Converter uma tela de leitura simples primeiro** (ex.: lista de tenants ou audit, que tem menos formulário acoplado) de Client Component + useEffect para Server Component + `await fetch()`.
3. **Entender cache do `fetch()` do Next.js**: `cache: 'force-cache'` vs `'no-store'`, `revalidate`, e por que isso é diferente do fetch do browser.
4. **Separar o que precisa ser client** (formulário, tabela com interação, botões de ação) do que pode ser server (a busca inicial de dados) — um Server Component "pai" que passa dados como props pra um Client Component "filho" interativo.
5. **Mutações com Server Actions** em vez de `apiRequest` chamado direto do hook client — outro pilar de "o jeito Next.js" de escrever, criar, atualizar dados.

Quer começar pelo passo 1 (migrar auth para cookie) — que é a fundação — ou prefere primeiro eu te mostrar na prática, com uma tela mais simples (ex. tenants), a diferença entre Server e Client Component antes de mexer no auth?

O plano (e uma decisão de arquitetura importante)
Migrar o token pra cookie httpOnly resolve o problema de segurança (XSS não consegue mais roubar o token, já que JS não lê cookie httpOnly) — mas cria uma consequência em cascata: se o JS não consegue mais ler o token, nenhum dos seus hooks atuais (useUsers, useRoles, usePermissions...) consegue mais montar o header Authorization: Bearer manualmente, como fazem hoje.
A solução profissional pra isso — e é assim que aplicações reais em produção fazem — é o Next.js virar um BFF (Backend For Frontend): o navegador só fala com o Next.js (mesma origem, cookie vai junto automaticamente); o servidor do Next.js é quem, de posse do cookie, monta o header Authorization e fala com a API NestJS. Um "tradutor" de sessão-cookie para Bearer-token, escondido do navegador.
Vou implementar isso com um Route Handler genérico de proxy — um único arquivo que recebe qualquer chamada de API do seu app, injeta o token do cookie, e repassa pro NestJS. Isso resolve tudo de uma vez sem quebrar as outras telas (users, roles, etc.), e ainda deixa o terreno pronto pra você migrar página por página pra Server Components depois, no seu ritmo.
Vou construir nesta ordem, explicando cada peça:

Route Handlers de login/register/logout — setam/limpam o cookie httpOnly
Route Handler /api/auth/me — restaura sessão lendo o cookie no servidor
middleware.ts — protege /main/* antes mesmo da página renderizar (substitui o useEffect com redirect que hoje pisca conteúdo)
Route Handler de proxy — traduz cookie → Bearer para as demais chamadas
Reescrever AuthContext e api-client.ts pra usar tudo isso
Migro o users como exemplo completo funcionando; você aplica o mesmo padrão mecânico nos outros (roles, permissions, tenants, tasks, audit) como exercício

Estrutura

```bash
frontend/
├── middleware.ts                          ← NOVO, na RAIZ do frontend (fora de app/)
├── .env.local.example                     ← NOVO, na raiz também
├── lib/
│   ├── session.ts                         ← NOVO
│   └── api-client.ts                      ← EDITADO (já existia)
├── contexts/
│   └── auth-context.tsx                   ← EDITADO (já existia)
├── features/
│   ├── auth/
│   │   └── auth.service.ts                ← EDITADO (só tipos agora)
│   ├── users/
│   │   ├── hooks/useUsers.ts              ← EDITADO
│   │   └── services/userService.ts        ← EDITADO
│   ├── roles/hooks/useRoles.ts            ← EDITADO
│   ├── permissions/hooks/usePermissions.ts ← EDITADO
│   ├── tenants/hooks/useTenants.ts        ← EDITADO
│   ├── tasks/hooks/use-tasks.ts           ← EDITADO
│   └── audit/hooks/useAudit.ts            ← EDITADO
├── app/
│   ├── main/page.tsx                      ← EDITADO
│   ├── main/audit/page.tsx                ← EDITADO
│   └── api/                               ← NOVA PASTA, tudo dentro é NOVO
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── register/route.ts
│       │   ├── logout/route.ts
│       │   └── me/route.ts
│       └── proxy/
│           └── [...path]/route.ts
```
