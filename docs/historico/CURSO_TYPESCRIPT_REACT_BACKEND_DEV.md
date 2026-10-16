# TypeScript + React para Backend Devs — Curso Rápido com Exemplos do `study`

> Todo exemplo abaixo foi tirado (ou adaptado) do seu próprio projeto `study`, porque tipagem só gruda quando você vê no contexto onde já doeu.

---

## Parte 1 — Os 4 casos que você trouxe

### 1. `React.ReactNode`

**O que é:** o tipo "isso pode ser renderizado dentro de JSX". Não é um componente, é *o resultado* de renderizar algo — uma string, um número, um `<div>`, um array de `<div>`s, `null`, `undefined`, `true`/`false` (que o React ignora), ou outro `ReactNode`.

Pensa assim (analogia backend): se `JSX.Element` fosse um DTO específico (tipo `UserResponseDto`), `ReactNode` seria `unknown` — "qualquer coisa que o serializador de resposta sabe processar". É o tipo mais permissivo que ainda faz sentido pra UI.

**Onde você já usa, sem saber que era isso:**

```tsx
// components/DetailView/DetailView.tsx
interface DetailViewProps<T> {
    toolbar?: React.ReactNode;   // pode ser um <button>, uma string, vários elementos, nada
}
```

```tsx
// screens/DetailViewScreen.tsx (do plano anterior)
export type DetailLayout<T> = {
    main: (ctx: DetailContext<T>) => React.ReactNode;  // a função pode devolver QUALQUER coisa renderizável
};
```

**Quando usar:**
- Toda vez que uma prop vai ser **jogada direto no JSX** sem você mexer no valor (`{children}`, `{toolbar}`, `{actions}`).
- Quando você quer aceitar tanto `<Componente />` quanto `"um texto simples"` quanto `null` na mesma prop.

**Quando NÃO usar (erro comum de quem vem do backend):**
- Se a prop é *um componente* que vai ser instanciado depois (ex: você recebe o componente e não o elemento já pronto), o tipo certo é `React.ComponentType<Props>`, não `ReactNode`. Ver seção 2.7 abaixo — é uma pegadinha real.

```ts
// ReactNode = "aqui está o resultado pronto pra desenhar"
toolbar: React.ReactNode        // uso: <DetailView toolbar={<button>Salvar</button>} />

// ComponentType = "aqui está a fábrica, você que sabe quando instanciar"
component: React.ComponentType<{ recordId: string }>   // uso: <RelationView component={RelationTablePanel} recordId={id} />
```

---

### 2. `{ items }: { items: AuditFeedItem[] }`

Isso são **duas coisas empilhadas** e vale separar mentalmente:

**(a) Destructuring** — `{ items }` — isso é JS puro, nem é TypeScript. É a mesma coisa que em outras linguagens seria "desempacotar um objeto em variáveis". Equivalente a:

```ts
function AuditPanel(props) {
    const items = props.items;  // exatamente o que { items } faz, só que inline no parâmetro
}
```

**(b) A anotação de tipo depois dos dois pontos** — `: { items: AuditFeedItem[] }` — isso é a "assinatura do DTO de entrada" da função, só que anônima (um *object type literal*, não uma `interface` nomeada).

Junte os dois e você lê assim: *"recebo um objeto, extraio a chave `items` dele, e esse objeto tem o formato `{ items: AuditFeedItem[] }`"*.

**Exemplo real do seu código:**

```tsx
// screens/DetailViewScreen.tsx (do plano anterior)
export async function DetailViewScreen({ moduleName, id }: { moduleName: string; id: string }) {
    // 'moduleName' e 'id' já chegam como variáveis prontas aqui dentro
}
```

Isso é **idêntico** a escrever:

```tsx
type DetailViewScreenProps = { moduleName: string; id: string };

export async function DetailViewScreen(props: DetailViewScreenProps) {
    const { moduleName, id } = props;
}
```

**Quando usar cada forma:**
- Tipo **inline** (`{ items }: { items: X[] }`) — quando o tipo só é usado *ali*, numa função só, e não vale a pena nomear. Bom pra componentes pequenos, folha da árvore.
- Tipo **nomeado** (`type Props = {...}` ou `interface Props {...}`) — quando (1) o tipo é grande, (2) é reaproveitado em mais de um lugar, ou (3) você quer exportar pra outro arquivo importar. Exemplo do seu próprio código:

```tsx
// components/DetailView/DetailView.tsx — nomeado porque tem 7 campos e é exportável
interface DetailViewProps<T> {
    moduleDefinition: RecordModuleDefinition<T>;
    record: T;
    contextItems: ContextItem[];
    auditItems: AuditFeedItem[];
    title: string;
    description?: string;
    toolbar?: React.ReactNode;
}
```

**Regra prática:** se você tem que rolar a tela pra ler a assinatura da função, era pra ser um `type`/`interface` nomeado.

---

### 3. `searchParams: Promise<Record<string, string | string[] | undefined>>`

Vamos quebrar de dentro pra fora, porque tem 3 conceitos empilhados:

**`Record<K, V>`** — utility type nativo do TS. `Record<string, X>` = "um objeto onde eu não sei os nomes das chaves de antemão, mas sei que toda chave é uma `string` e todo valor é do tipo `X`". É o equivalente TS de `Map<String, X>` no Java, ou `Dict[str, X]` no Python — só que aplicado a um *object literal* comum, não a uma classe `Map`.

**`string | string[] | undefined`** — union type. Lê-se "ou uma, ou outra, ou outra". Por quê essas três especificamente? Porque é assim que o Next.js entrega `searchParams` de verdade:
- `?q=react` → `{ q: "react" }` (string)
- `?tag=a&tag=a&tag=b` (parâmetro repetido) → `{ tag: ["a", "b"] }` (array)
- parâmetro que nunca veio → a chave simplesmente não existe, e ao acessar `params.foo` o TS te dá `undefined`

Isso não é capricho de tipagem — é o **formato real do dado**, então o tipo é honesto sobre a ambiguidade que a URL tem.

**`Promise<...>`** — desde o Next.js 15, `params` e `searchParams` em Server Components **são assíncronos** (motivo: o Next quer poder adiar a resolução deles pra otimizar streaming). Antes eram objetos síncronos; agora são uma Promise que você precisa dar `await`. Isso é uma mudança de *runtime* que o tipo só está refletindo.

**Juntando tudo**, do seu código:

```tsx
// app/(app)/favorites/page.tsx
export default async function FavoritesPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const rawParams = await searchParams;   // ⬅ obrigatório: sem await, rawParams seria a Promise inteira, não o objeto
    const view = typeof rawParams.view === "string" ? rawParams.view : favoritesModule.defaultView;
    //           ^^^^^^^^^^^^^^^^^^^^^^^^^^^ isso é um "type guard" — ver seção 2.3 abaixo, é obrigatório por causa da union
}
```

**Quando você vai precisar escrever isso de novo:** todo `page.tsx` que é Server Component e usa rota dinâmica (`[id]`) ou querystring. O padrão pra `params` é igual:

```tsx
// app/(app)/favorites/[id]/page.tsx
interface PageProps {
    params: Promise<{ id: string }>;   // aqui você SABE o formato, {id} vem da própria rota — não precisa de Record<>
}
```

Note a diferença: `params` você tipa explícito (`{ id: string }`) porque o nome do parâmetro dinâmico é conhecido (é o nome da pasta `[id]`). `searchParams` você usa `Record<string, ...>` porque *qualquer* querystring pode aparecer.

---

### 4. `<T extends { id: string | number; title: string }>`

Isso é **generics com constraint** (restrição). Vamos por partes:

**Generics sem constraint** — `<T>` sozinho — significa "essa função/componente funciona com qualquer tipo, e eu vou descobrir qual tipo é quando alguém usar". É o equivalente a um método genérico em Java (`<T> T identity(T x)`) ou um `TypeVar` em Python com `Generic[T]`.

```ts
function identity<T>(value: T): T {
    return value;
}
identity<string>("oi");   // T = string
identity<number>(42);     // T = number
```

**Generics COM constraint** — `<T extends X>` — significa "T pode ser qualquer tipo, **desde que** tenha pelo menos o formato de X". É diferente de herança de classe (não é "T é subclasse de X") — é estrutural: "T precisa ter esses campos, não importa como".

No seu código:

```tsx
// components/TypeView/TypeView.tsx (versão antiga)
export function TypeView<T extends { id: string | number; title: string }>({
    data,
    mode,
}: {
    data: T[];
    mode: TypeViewMode;
}) { ... }
```

Isso diz: *"`TypeView` funciona com qualquer entidade — `FavoriteEntity`, `RoleEntity`, o que for — desde que essa entidade tenha um `id` (string ou number) e um `title` (string). Todo o resto dos campos pode variar."*

**Por que a constraint existe aqui:** porque, dentro do componente, provavelmente em algum lugar tem código tipo `key={item.id}` ou `{item.title}` — o TS só deixa você acessar `.id`/`.title` de um `T` genérico se você **provar**, via `extends`, que todo `T` possível tem esses campos. Sem o `extends`, `T` seria totalmente opaco e `item.id` daria erro de compilação ("Property 'id' does not exist on type T").

**Analogia backend:** é como um método Java `<T extends Comparable<T>> T max(List<T> list)` — você só pode chamar `.compareTo()` dentro do método porque a assinatura *garante* que `T` tem esse método.

**Quando usar generics com constraint no seu projeto:**
- Sempre que você escreve um componente/função "de infraestrutura" (tipo `TypeView`, `DetailView`, `FormView`) que precisa funcionar com **qualquer módulo** (`favorites`, `roles`, `tenants`...), mas ainda assim precisa acessar 1-2 campos específicos pra funcionar (`id` pra key de lista, `title` pra exibir, etc.).
- Se o componente não acessa nenhum campo específico do tipo (só repassa `T` adiante), não precisa de constraint — `<T>` puro já basta. Exemplo: `RecordModuleDefinition<T = unknown>` no seu `registry/types.ts` não tem constraint porque o registry nunca acessa campos de `T`, só guarda e devolve.

---

## Parte 2 — Referências essenciais pra um dev sênior de Next.js

### 2.1 `type` vs `interface` — quando usar cada um

Regra prática que a maioria dos times sênior segue:

| Use `interface` quando | Use `type` quando |
|---|---|
| É a forma de um objeto/props de componente | É union (`"a" \| "b"`), tupla, ou tipo utilitário derivado |
| Pode precisar ser estendido depois (`interface B extends A`) | É definitivo, não vai ser herdado |

No seu código, `RecordModuleDefinition<T>` é `type` porque é montado combinando outros tipos (`RecordModuleDataHandlers<T> & ...`), enquanto `DetailViewProps<T>` é `interface` porque é uma forma de props "fechada". Ambos funcionam quase sempre de forma intercambiável — a diferença raramente importa na prática, mas seguir uma convenção consistente no time importa mais que qual você escolhe.

### 2.2 `unknown` vs `any` — o `any` é uma bomba-relógio

```ts
function createFavorite(payload: unknown): Promise<FavoriteEntity> { ... }
```

`any` = "desliga o TypeScript pra essa variável" — você pode chamar qualquer método, acessar qualquer campo, o compilador não reclama nunca, e o erro só aparece em runtime (exatamente o problema que tipagem deveria evitar).

`unknown` = "eu aceito qualquer coisa, mas você é **obrigado** a provar o que é antes de usar". Com `unknown` você não consegue fazer `payload.title` direto — o TS exige um type guard, `as`, ou um schema de validação (ex: Zod) primeiro. Por isso `payload: unknown` no seu `provider.ts` é a escolha certa pra dados vindos de fora (body de request, resposta de API) — força você a validar antes de confiar no formato.

### 2.3 Type narrowing / type guards — o `typeof` que "muda o tipo"

```tsx
const view = typeof rawParams.view === "string" ? rawParams.view : favoritesModule.defaultView;
```

Antes desse `typeof`, `rawParams.view` tem tipo `string | string[] | undefined`. **Dentro** do bloco `? rawParams.view`, o TypeScript "restringe" (narrowing) o tipo pra só `string`, porque provou que a condição garante isso. É por isso que esse padrão aparece tanto no seu código: sempre que você tem uma union, o TS te obriga a "provar" qual branch da união você está antes de usar o valor com segurança.

Outros type guards comuns:
```ts
if (Array.isArray(value)) { /* value é X[] aqui dentro */ }
if (value !== undefined) { /* value perde o | undefined aqui dentro */ }
if ("email" in user) { /* prova que o objeto tem essa chave */ }
```

### 2.4 Optional (`?`) vs `| undefined` — parecem iguais, não são

```ts
type A = { create?: (payload: unknown) => Promise<T> };        // a CHAVE pode não existir
type B = { create: ((payload: unknown) => Promise<T>) | undefined }; // a chave EXISTE, mas pode valer undefined
```

Na prática, pra maioria dos casos o comportamento é parecido, mas `?` é o padrão certo pra "esse campo é dispensável" (é o que você já está usando certo em `RecordModuleDataHandlers`):

```ts
export type RecordModuleDataHandlers<T> = {
    search: (args: SearchArgs) => Promise<SearchResult<T>>;
    read: (id: string) => Promise<T>;
    create?: (payload: unknown) => Promise<T>;   // módulo read-only (audit) simplesmente não declara
    update?: (id: string, payload: unknown) => Promise<T>;
    delete?: (id: string) => Promise<void>;
};
```

### 2.5 `Partial<T>`, `Pick<T>`, `Omit<T>`, `Record<K,V>` — os utility types que valem memorizar

```ts
type Favorite = { id: string; title: string; url: string; createdAt: string };

Partial<Favorite>        // todos os campos viram opcionais — útil pra "patch"/update parcial
Pick<Favorite, "title" | "url">   // só os campos escolhidos — útil pra formulário de criação
Omit<Favorite, "id" | "createdAt"> // todos MENOS os escolhidos — útil pra payload de create (sem campos gerados pelo backend)
Record<string, unknown>  // objeto dinâmico — visto na seção 1.3
```

Isso resolve exatamente o problema clássico de backend dev no frontend: "por que preciso de um tipo pra criar e outro pra ler?" — resposta: porque o payload de `create` não tem `id`/`createdAt` (o backend gera), mas a entidade lida do banco tem. Em vez de escrever os dois tipos na mão, você deriva um do outro:

```ts
type FavoriteEntity = { id: string; title: string; url: string; createdAt: string; user: {...}; tenant: {...} };
type CreateFavoritePayload = Omit<FavoriteEntity, "id" | "createdAt" | "user" | "tenant">;
```

Se `FavoriteEntity` ganhar um campo novo, `CreateFavoritePayload` **não precisa ser editado** — ele já reflete a mudança automaticamente (menos um lugar pra esquecer de atualizar).

### 2.6 Union discriminada (discriminated union) — o "switch" tipado

```ts
export type TypeViewMode = "list" | "cards" | "graph" | "text" | "form";

switch (mode) {
    case "list": return listView;
    case "cards": return cardsView;
    // ...
    default:
        return mode satisfies never;   // ⬅ ver 2.9
}
```

Isso é uma union de *string literals* (não tipos genéricos — valores exatos permitidos). É o equivalente TS de um `enum` — mas nativo do sistema de tipos, sem gerar código extra em runtime (diferente de `enum` do TS, que gera um objeto JS de verdade — por isso muita gente sênior prefere union de literais a `enum`).

### 2.7 `React.ComponentType<Props>` — quando você passa o componente, não o elemento

```ts
relations?: Array<{
    key: string;
    component: React.ComponentType<{ recordId: string; initialData: unknown[] }>;
}>;
```

Diferença de `ReactNode` (seção 1.1): aqui você está dizendo "eu quero **a referência à função/classe do componente**", não um elemento já pronto. Quem recebe essa prop decide *quando* instanciar:

```tsx
const Component = relation.component;
return <Component recordId={id} initialData={data} />;
```

Isso é útil quando o "dono" da lista de relations não sabe (e não deveria saber) quais props cada relation específica precisa além do básico — o componente concreto é passado de fábrica.

### 2.8 `as const` — "trava" um literal pra não virar `string` genérico

```ts
const formFields = [
    { name: "title" as const, label: "Título", type: "text" as const, required: true },
];
```

Sem `as const`, TS infere `name: string` e `type: string` (generaliza). Com `as const`, TS infere `name: "title"` e `type: "text"` (o valor literal exato). Isso importa quando outro tipo depende do valor exato — no seu caso, `FormFieldConfig<T>.name` é tipado como `keyof T & string` (seção 2.10), e sem `as const` o TS não consegue verificar se `"title"` é de fato uma chave válida de `FavoriteEntity`.

### 2.9 `satisfies never` / exhaustiveness check — pega esquecimento em compile time

```ts
switch (mode) {
    case "list": return listView;
    case "cards": return cardsView;
    case "graph": return graphView;
    case "text": return <TextView data={data} />;
    case "form": return formView;
    default:
        return mode satisfies never;
}
```

Se alguém adicionar `"calendar"` na union `TypeViewMode` e esquecer de tratar no switch, o `default` vai receber `mode` com o tipo `"calendar"` sobrando — e como `"calendar"` não é atribuível a `never`, **o build quebra**. É um dos truques mais valiosos de TS: transforma "esqueci de tratar um caso" de bug-em-produção pra erro-de-compilação. Equivalente ao `@Nonnull` + `switch` exaustivo do Java moderno, ou ao `match` exaustivo do Rust.

### 2.10 `keyof` — extrai as chaves de um tipo como union

```ts
export type FormFieldConfig<T> = {
    name: keyof T & string;   // "name só pode ser uma chave que EXISTE em T, e que seja string"
    label: string;
    type: "text" | "url" | "textarea";
};
```

`keyof FavoriteEntity` vira automaticamente `"id" | "title" | "url" | "createdAt" | "user" | "tenant"`. Isso significa que se você escrever `{ name: "titel" }` (erro de digitação), o TS acusa erro — porque `"titel"` não é uma chave de `FavoriteEntity`. É tipagem "amarrada ao dado real", que se atualiza sozinha se a entidade mudar.

O `& string` extra existe porque `keyof` também poderia incluir `number`/`symbol` se o tipo tivesse index signatures — o `& string` filtra só chaves que são de fato strings, evitando um tipo mais permissivo do que o necessário.

### 2.11 `"use client"` vs Server Component — não é tipagem, mas afeta MUITO os tipos que você pode usar

Isso é o maior gap conceitual pra quem vem de backend puro:

- **Server Component** (padrão, sem diretiva) — roda só no servidor, pode ser `async function`, pode dar `await` em chamadas de banco/API direto no corpo do componente, **não pode** usar hooks (`useState`, `useEffect`) nem handlers de evento (`onClick`).
- **Client Component** (`"use client"` no topo do arquivo) — roda no browser (e é pré-renderizado no server só na primeira carga), pode usar hooks e eventos, **não pode** ser `async function` no mesmo sentido (não dá pra `await` direto no corpo — usa `useEffect`/bibliotecas de fetch).

Reflexo direto na tipagem: `favorites/page.tsx` é `async function FavoritesPage(...)` porque é Server Component. `ViewSwitcher.tsx` tem `"use client"` porque usa `useRouter`/`useSearchParams` (hooks) — e por isso ele **não pode** ser `async`.

### 2.12 Genéricos em componentes React — sintaxe que confunde em `.tsx`

```tsx
export function TypeView<T extends { id: string | number }>({ data }: { data: T[] }) { ... }
```

Em arquivo `.tsx`, `<T>` sozinho no chamador pode ser ambíguo com JSX (`<T>` parece uma tag). Por isso, ao *usar* um componente genérico com tipo explícito, a sintaxe é:

```tsx
<FormView<FavoriteEntity> mode="edit" fields={formFields} initialValues={record} />
```

O `<FavoriteEntity>` logo depois do nome do componente é o "generic type argument" explícito — geralmente dispensável (o TS infere pelo `initialValues`), mas útil quando a inferência não tem informação suficiente pra adivinhar sozinha.

### 2.13 `Awaited<T>` — desembrulha uma `Promise` no nível de tipo

```ts
type FavoriteEntity = Awaited<ReturnType<typeof readFavorite>>;
```

Combinação de dois utility types: `ReturnType<typeof fn>` pega o tipo de retorno de uma função (aqui, `Promise<FavoriteEntity>`), e `Awaited<...>` "tira a Promise de dentro", ficando só `FavoriteEntity`. Útil pra não duplicar a definição do tipo de retorno de uma função async em outro lugar — você deriva em vez de reescrever.

---

## Resumo mental (pra guardar, não pra decorar)

| Conceito | Pergunta que ele responde |
|---|---|
| `ReactNode` | "isso vai ser jogado dentro do JSX como está?" |
| `{ x }: { x: T }` | desestruturação (JS) + forma do objeto de entrada (TS) |
| `Promise<T>` numa prop | "esse valor só existe depois de um `await`" (Next 15: `params`/`searchParams`) |
| `<T extends X>` | "aceito qualquer tipo, contanto que tenha pelo menos a forma de X" |
| `unknown` vs `any` | `unknown` = "prove antes de usar"; `any` = "desligo a proteção" |
| `Partial`/`Pick`/`Omit` | "derive um tipo novo a partir de um que já existe, sem duplicar" |
| union de literais (`"a" \| "b"`) | "só esses valores exatos são válidos" (enum sem overhead de runtime) |
| `keyof T` | "as chaves de T, como tipo" |
| `ComponentType<Props>` vs `ReactNode` | "passo a fábrica" vs "passo o produto pronto" |
| `"use client"` | "isso roda no browser, então não pode ser async no corpo e pode usar hooks" |

Quer que eu monte um exercício prático — por exemplo, pegar o `contract.tsx` de um módulo novo (`roles` ou `tenants`) e você tenta tipar do zero, com eu revisando linha a linha?
