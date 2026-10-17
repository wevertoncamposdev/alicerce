Revisei o repo (commits até `8f358fc`). Boa notícia: várias coisas que você reportou como "faltando" já estão implementadas — o `role.detail` já tem autosave e attach/detach funcionando nos dois relacionamentos, com link de navegação pro registro vinculado. O que achei são gaps pontuais e uma regressão real. Aqui está o plano.

## Diagnóstico (grounded no código atual)

**1. MetaDataSidebar regrediu do padrão drawer**
Achei a versão antiga no histórico (commit `6640cbf`): era um `Drawer` (vaul/shadcn) deslizando da direita, acionado por um botão. Em algum commit recente isso foi trocado por um painel sempre visível, embutido no fluxo da página (`MetaDataSidebar.tsx` atual usa `useState(true)` + colapsa inline, não é mais drawer). É exatamente a regressão que você descreveu.

**2. Audit "não funciona" — achei a causa exata, e é só pra Users**
O `AuditInterceptor` deriva o nome da entidade a partir da URL: `PATCH /api/user/:id` → grava `entity: "user"` (singular, porque o controller é `@Controller('user')`). Mas o frontend consulta a trilha com `getEntityAuditTrail("users", id)` — **plural**. Resultado: a aba Auditoria de `user.detail` sempre vem vazia, porque a busca filtra por `entity=users` e nada no banco tem esse valor exato. Roles e Permissions não têm esse problema (controllers já são plural, batem com o nome do módulo).

**3. role.detail — na verdade já está pronto**
Conferi `roles/config/contract.tsx`: `main` já é `FormView mode="edit"` com autosave (mesmo padrão do favorites), `relations` já tem as duas abas (Users, Permissions) com attach via picker, detach, e `rowLink` apontando pra `/users/${id}` e `/permissions/${id}`. Não precisa de trabalho aqui — só herda a correção do drawer (item 1).

**4. user.detail — dois problemas reais**

- `UserRolesHost` (a aba Roles dentro de user.detail) **não tem `rowLink`** — diferente do `RoleUsersHost`/`RolePermissionsHost`, que já linkam. Attach/detach funcionam, só falta o link clicável pro `role.detail`.
- **Bug sério nos formFields**: o campo `password` perdeu a flag `createOnly: true` que eu tinha colocado, e o campo `status` sumiu inteiramente. Como o autosave envia todos os campos editáveis juntos a cada `blur`, isso significa que **qualquer edição em `user.detail` hoje tenta mandar `password: ""` no PATCH** — e o backend rejeita com 400 (`@MinLength(6)`). Ou seja, o formulário de edição de usuário está funcionalmente quebrado agora, não só faltando polimento.

## Plano de ajustes

| # | Item | Onde | O quê |
| --- | --- | --- | --- |
| 1 | Restaurar drawer de metadados | `MetaDataSidebar.tsx` | Voltar ao `Drawer` (já existe em `components/ui/drawer.tsx`, não precisa criar nada novo), mas com o trigger movido pro slot `actions` do `AppTopbar` (que já existe e está vazio) em vez do botão flutuante antigo (`fixed right-4 top-1`) |
| 2 | Passar o trigger pelo `DetailViewScreen` | `screens/DetailViewScreen.tsx` + `AppTopbar.tsx` | O ícone de seta vai em `<AppTopbar actions={<MetaDataTrigger/>} />`, ficando à direita da topbar — mesma posição de qualquer ação de tela |
| 3 | Corrigir nome de entidade na trilha de auditoria | `screens/DetailViewScreen.tsx` ou `user.controller.ts` | Mais seguro: padronizar pelo lado do backend — trocar `@Controller('user')` para `@Controller('users')` (alinha com o padrão plural que `roles`/`permissions` já seguem) OU mapear `moduleName → resource` no `resolveAuditItems`. Vou com a 2ª opção pra não mexer em rotas já em uso |
| 4 | Corrigir formFields de User | `modules/users/config/contract.tsx` | Devolver `createOnly: true` no `password`, devolver o `select` de `status` (enum `Status`) que existia antes |
| 5 | Link de navegação em UserRolesHost | `modules/users/components/UserRolesHost.tsx` | Adicionar `rowLink: (r) => \`/roles/${r.id}\`` — 1 linha, mesmo padrão dos outros 2 hosts |

## Ordem de execução

Prioridade pelo risco: **item 4 primeiro** (é o único que quebra dado em produção agora — autosave falhando silenciosamente em `user.detail`), depois **item 3** (funcionalidade ausente, mas não destrutiva), depois **itens 1+2 juntos** (mesma mudança, visual), depois **item 5** (trivial).