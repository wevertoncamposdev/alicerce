Achei — o auth mudou nesse commit. Vou ver o diff exato do fluxo de login.Encontrei a causa raiz — o problema **não é no login em si**. É o commit mais recente (`d648a97 "update"`, de hoje) que reescreveu o `dashboard/page.tsx`, e essa reescrita expôs um bug real.

## O que realmente acontece

O `POST /auth/login` no backend é `@Public()` e não tem nenhum guard de role — ele funciona normalmente e devolve o token. O problema é **depois**: o dashboard (para onde você é redirecionado após o login) agora, nesse commit, passou a chamar `searchRoles`, `searchUsers` e `searchPermissions` em paralelo via `Promise.all` assim que a página carrega:

```ts
const [usersResult, rolesResult, permissionsResult] = await Promise.all([
  searchUsers(...), searchRoles(...), searchPermissions(...),
]);
```

E `roles.controller.ts` / `permissions.controller.ts` exigem **estritamente** `@Roles('ADMIN')` em **todos** os endpoints (`search`, `get`, `post`, etc. — conferi todos, são 100% consistentes entre si). Já `user.controller.ts` aceita `@Roles('ADMIN', 'USER')`, mais permissivo.

Então: se a conta que você usou pra logar tem uma role cujo `type` **não é exatamente `'ADMIN'`**, o `searchUsers` passa, mas `searchRoles`/`searchPermissions` batem no guard e disparam `ForbiddenException('Acesso negado: role insuficiente')`. Como é `Promise.all`, a primeira rejeição já derruba tudo, o dashboard captura essa exceção e mostra a mensagem crua num banner vermelho logo abaixo do topbar — **na primeira tela que você vê depois de logar**. Por isso parece que o login falhou, mas na verdade ele funcionou; quem falhou foi a primeira chamada de dados da tela seguinte.

## Por que a role pode não ser 'ADMIN'

Não consigo confirmar isso sem acesso ao seu banco, mas pelo código há dois caminhos possíveis:
- Você testou com uma conta cuja role tem `type: 'USER'` (ou outro valor) — nesse caso o comportamento é "esperado" dado o design atual (só ADMIN gerencia roles/permissions), só que o dashboard não deveria travar por causa disso.
- Você criou uma Role pela tela e digitou o tipo manualmente — hoje o campo `type` do formulário de Role é um `<Input>` de texto livre, não um select vinculado ao enum `RoleType` (`ADMIN|USER|GUEST`). Se não bateu exatamente com `ADMIN`, o backend teria rejeitado a criação (400, por causa do `@IsEnum`), então é pouco provável que isso tenha entrado errado no banco — mas vale conferir direto: `select type from "Role" where ...` pra confirmar.

## O bug de produto, independente da causa exata

O dashboard não deveria travar a experiência inteira de um usuário não-admin só porque ele não pode ver estatísticas de roles/permissions. Isso é sintoma direto de dois problemas que já estavam na minha lista:
1. `Promise.all` falha rápido — um único 403 derruba as 4 chamadas
2. Não há checagem de permissão no frontend antes de disparar a chamada — devia esconder/pular esses cards pra quem não é ADMIN, não estourar erro

## Correção que eu proponho

1. **Dashboard:** trocar `Promise.all` por `Promise.allSettled`, tratando cada card independentemente — se `searchRoles` falhar com 403, mostra "—" ou oculta o card, sem derrubar `users`/`permissions`/`audit`.
2. **Formulário de Role:** trocar o campo `type` de `<Input>` texto livre para `<select>` com as 3 opções do enum (isso também evita a causa raiz nº 2 acontecer de novo no futuro).
3. **Confirmação sua:** me diga (ou verifique no banco) qual `type` tem a role da conta que você usou pra testar — isso fecha se é bug de dado ou só de UX do dashboard.

Solução

Bom, `ApiServerError` tem `status`, dá pra distinguir 403 de outros erros. Agora vou reescrever o dashboard com degradação independente por card.`hasRole`/`hasPermission` já existem prontos. Vou usar isso para o dashboard checar antes de disparar as chamadas, além de `allSettled` como rede de segurança.Agora o formulário de Role/Permission — trocar o `type` de texto livre para select vinculado ao enum, que é a causa raiz nº 2.`Select` já existe pronto. Vou estender `FormFieldConfig` para suportar `select`/`textarea`/`password` de verdade e usar no `FormView`.Agora reescrevo o `FormView` para de fato respeitar `type`, incluindo `required` no HTML e mensagens de erro reais:Agora corrijo a causa raiz nº 1 confirmada anteriormente: `create()` de Role/Permission não injeta `tenantId`.Confirmado: o padrão do projeto (`CreateFavoriteDto`) é **não ter `tenantId` no DTO** — ele vem só do contexto do servidor. Vou alinhar Role/Permission a esse padrão em vez de deixar campo redundante.Vou remover `tenantId` do DTO (segue o padrão `CreateFavoriteDto`) e ajustar service/controller para receberem `tenantId` separadamente.Agora ajusto os services para aceitarem `tenantId` como parâmetro separado:Agora ajusto os controllers para chamar com essa nova assinatura (desfazendo o spread anterior):Boa, sem quebras. Agora vamos aos formulários de Role e Permission — trocar `type` texto livre por `select`, e adicionar `password` ao User.Agora o `password` que faltava no formulário de User, causa raiz confirmada de create quebrado:Agora melhoro a propagação de erro real do backend (hoje `createRecordFormAction` engole tudo num texto genérico) — importante pra você conseguir depurar isso no futuro sem precisar de mim:Agora, resumo do que foi resolvido e commitado localmente (você aplica no seu ambiente):

## O que corrigi

**1. Causa raiz do "role insuficiente" pós-login**
- `dashboard/page.tsx`: trocado o `Promise.all` que derrubava tudo por chamadas isoladas por card (`loadCard`), com checagem prévia via `hasRole(currentUser, "ADMIN")` — usuários não-admin simplesmente não disparam mais a chamada de roles/permissions, e veem um card neutro ("Sem acesso a este dado") em vez de erro. Um 403 real vira estado visual, não mais uma exceção que quebra a página inteira.

**2. Causa raiz nº 2 que eu tinha apontado (`type` como texto livre)**
- `FormFieldConfig` ganhou os tipos `select | password | email` de verdade (antes só existiam no papel — o `FormView` ignorava e sempre renderizava `<Input>`)
- `FormView` reescrito: `select` agora usa o componente `Select` do shadcn já existente no projeto; `textarea` agora realmente vira `<textarea>` (antes virava `<Input>` de uma linha); `required` agora é propagado pro HTML
- Role.type e Permission.type agora são `select` vinculados aos enums reais (`RoleType`, `PermissionType`) — impossível digitar um valor inválido pela UI daqui pra frente

**3. Bug bloqueador que eu tinha apontado antes (create de User sem senha)**
- Adicionei o campo `password` (obrigatório, `createOnly: true` — some no formulário de edição, já que reset de senha é outro fluxo)
- `FormView` agora sabe filtrar campos `createOnly` automaticamente no modo edição

**4. `tenantId` ausente no create de Role/Permission** (a outra causa que eu tinha apontado)
- Segui o padrão que já existe no `CreateFavoriteDto`: `tenantId` não existe mais nem no `CreateRoleDto` nem no `CreatePermissionDto` — vem exclusivamente de `@TenantId()` no controller, nunca do body. Isso fecha de vez a possibilidade de alguém (front quebrado ou request manual) criar um registro em tenant errado.

**5. Erros mudos**
- `createRecordFormAction` agora propaga a mensagem real de validação do backend em vez de "Não foi possível criar o registro." genérico — próxima vez que algo assim quebrar, você vai ver o motivo direto no formulário.

## O que eu recomendo você testar primeiro

1. Logar com a conta que deu o erro original e confirmar se o dashboard carrega sem o banner vermelho (mesmo que os cards de Papéis/Permissões apareçam como "—" se a conta não for ADMIN)
2. Criar uma Role nova pela tela — confirmar que o `type` agora é um select e que salva sem 400
3. Criar um User novo — confirmar que o campo Senha aparece e a criação completa com sucesso