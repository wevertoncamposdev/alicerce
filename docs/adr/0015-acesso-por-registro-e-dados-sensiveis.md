# ADR 0015 — Acesso por registro e dados sensíveis

- Status: aceito
- Data: 2026-11-04
- Escopo: nenhum. Tabela da seção 4 do `docs/PLAN-fundacao-ux.md`
  confirma `core/`: Não para a U8 — esta etapa é só decisão, sem
  nenhuma linha de código. Quando a implementação acontecer (gatilho:
  módulo `atendimento` do TerceiroGestor), ela precisa do seu próprio
  ADR de escopo de `core/` ou de uma ampliação do ADR 0014, a decidir
  naquele momento.

## Contexto

`docs/backlog.md` já registra o gatilho desde a avaliação da fundação de
UX: "Escopo por registro (`.read.own`) — conversa com a ONG mostrar que
alguém só pode ver o que é seu". O caso concreto é o Atendimento Social do
TerceiroGestor: um prontuário de psicologia ou de serviço social não pode
ser visível a qualquer usuário com `atendimento.read` — precisa respeitar
quem atendeu, o papel (psicólogo vs. assistente social) e, por ser dado de
saúde, as obrigações da LGPD (art. 11) sobre dado sensível: auditoria de
leitura e controle extra sobre exportação.

O `AGENTS.md` §2 pede ADR para decisão difícil de desfazer. Modelo de
acesso é exatamente esse caso — já tem o ADR 0007 (RBAC por permissão) e o
ADR 0014 decidiu adiar esta parte de propósito ("decisão de segurança
difícil de desfazer, mas que depende do caso real do Atendimento Social
pra não ser abstrata"). Decidir agora, implementar só quando o módulo
existir.

Mecanismos que já existem e esta decisão reaproveita, sem recriar:

- **Catálogo central** (`core/authorization/permission-catalog.ts`,
  `PermissionDefinition`) — fonte única de permissão, consumida pelo seed
  e pelo onboarding (ADR 0007).
- **Matriz de permissão por papel** (`GET/PUT /roles/:id/permission-matrix`,
  ADR 0007) — hoje é só concedido/não concedido por permissão.
- **Permissão herdada do registro** (`checkEntityPermission`/
  `assertEntityAccess`, `core/authorization/record-permission.util.ts`,
  U6) — Notas/Tags/Anexos de um registro usam a permissão do registro
  (`<entity>.read`/`<entity>.update`), sem entrada própria no catálogo.
- **Auditoria automática de 403** — `all-exceptions.filter.ts` já grava
  `AuditType.ACCESS_DENIED` (quem, quando, rota) para toda
  `ForbiddenException`, de qualquer guard ou service. Nenhum código novo
  precisa disparar isso.
- **`AuditInterceptor`** só audita `POST/PATCH/PUT/DELETE` (e `login`) hoje
  — `GET` nunca é auditado (`isAuditable`).

## Decisão

### 1. Escopo de leitura é propriedade da concessão (papel × permissão), não da permissão em si

Três escopos, exatamente os da seção 1 do plano: `OWN` (criado por mim ou
atribuído a mim), `ROLE` (visível a quem tem um papel específico, pela
categoria do registro) e `ALL` (sem filtro — comportamento atual de todo
módulo hoje).

- Novo enum `AccessScope { OWN, ROLE, ALL }` e nova coluna
  `RolePermission.scope: AccessScope @default(ALL)`. Migration só adiciona
  coluna com default `ALL`: nenhum papel existente muda de comportamento.
- `PermissionDefinition` ganha `scopable?: boolean` (default `false`).
  Só recursos que o módulo marcar como `scopable` (ex. `atendimento.read`)
  mostram o seletor de escopo na matriz de permissão; todo o resto do
  catálogo continua um checkbox só concedido/não concedido, como hoje.
- Novo helper em `core/authorization` — `resolveAccessScope(tenantId,
  userId, permissionName): AccessScope` — devolve o maior escopo entre os
  papéis do usuário para aquela permissão (`ALL` > `ROLE` > `OWN`, mesma
  regra de "maior vence" que já existe pra concessão simples).
- **Quem decide o filtro é o módulo, não o `core/`.** `core/` só garante o
  mecanismo (coluna + helper); o service do módulo aplica o `where`:
  `OWN` filtra pelos campos de "é meu" que o módulo declarar (ex.
  `createdById`/`profissionalId`); `ROLE` filtra pela categoria do
  registro batendo com o papel do usuário — o mapeamento categoria↔papel é
  regra do domínio (ex. "psicólogo só vê `tipo: PSICOLOGICO`"), nunca
  entra em `core/`; `ALL` não filtra.
- Lista (`search`) e detalhe (`findOneOrThrow`) usam o mesmo filtro. Um
  registro que existe no tenant mas fora do escopo do usuário, ao ser
  aberto direto pela URL, cai no caso 3 abaixo (403), não 404 — mesmo
  raciocínio do resto da base: tenant já isola por RLS, escopo de registro
  é a camada de cima.
- Metadados (Notas/Tags/Anexos, U6) herdam o filtro de graça: como eles já
  checam a permissão do registro (`assertEntityAccess`), um registro fora
  do escopo também nega metadado dele, sem código extra.

**Alternativa rejeitada:** três permissões por recurso no catálogo
(`atendimento.read`, `atendimento.read.own`, `atendimento.read.role`).
Mais simples de checar (é só presença/ausência), mas erra o modelo: escopo
é característica de quem recebeu a permissão, não da ação. Um papel de
coordenação precisa de `atendimento.read` com `ALL` e um papel de
atendente precisa da mesma permissão com `OWN` — multiplicar a permissão
por 3 no catálogo obrigaria todo consumidor de `PERMISSION_CATALOG` (seed,
onboarding, matriz) a conhecer a regra de escopo, e ainda não resolve
`ROLE` (que depende de categoria do registro, não cabe no nome da
permissão). Rejeitada.

### 2. Dado sensível (LGPD art. 11): leitura auditada e exportação com permissão própria

`PermissionDefinition` ganha `sensitive?: boolean` (default `false`), pro
módulo marcar o recurso (ex. `atendimento.read.sensitive = true`).

- **Leitura auditada.** Novo valor no enum `AuditType`: `SENSITIVE_READ`
  (sem `before`/`after` — é leitura, não mudança). `AuditInterceptor`
  passa a tratar `GET` como auditável *só* quando a entidade resolvida da
  URL corresponde a um recurso `sensitive` no catálogo; todo o resto do
  `GET` da aplicação continua fora da auditoria, como hoje — sem isso,
  cada página de lista viraria N linhas de auditoria por N registros.
- **Exportação exige permissão própria.** Recurso `sensitive` ganha uma
  segunda entrada no catálogo, `<recurso>.export`, obrigatória pro botão
  "Exportar CSV" da U3 (que hoje só confere `.read`). Recurso não marcado
  `sensitive` continua exportando sob a própria `.read`, sem mudança.

**Alternativa rejeitada:** auditar toda leitura de qualquer recurso.
Resolveria o caso sensível também, mas o custo (uma linha de auditoria por
registro visto, em toda lista paginada de todo módulo) não se justifica
pros 95% dos dados que a lei não exige rastrear. Rejeitada.

### 3. Como isso aparece pro usuário

- **Lista:** filtro implícito — a paginação e a contagem já refletem só o
  que o usuário pode ver, sem aviso de "faltam N registros". Mesmo
  tratamento que o filtro de tenant já recebe hoje.
- **Detalhe:** abrir um registro fora do escopo dá `403` com mensagem
  amigável em português (mesmo texto padrão do `assertEntityAccess`, ex.
  "Você não tem acesso a este registro"), nunca o erro cru. Vira
  `ACCESS_DENIED` na auditoria automaticamente — nenhum código novo pra
  isso, o `all-exceptions.filter.ts` já faz.
- **Auditoria:** `ACCESS_DENIED` (já existe) para tentativa fora de
  escopo; `SENSITIVE_READ` (novo, decisão 2) para leitura bem-sucedida de
  recurso sensível.

## Consequências

- Nenhum código nesta etapa. Implementação entra quando o módulo
  `atendimento` do TerceiroGestor começar (gatilho do backlog), e exige
  migration (`AccessScope`, `RolePermission.scope`, `AuditType.
  SENSITIVE_READ`), ponto de escopo de `core/` próprio (este ADR não abre
  `core/`) e UI nova na matriz de permissão (seletor own/role/all só pra
  recurso `scopable`) — fora desta fase.
- `checkEntityPermission`/`assertEntityAccess` (U6) não mudam de contrato;
  passam a herdar o filtro de escopo de graça quando o registro-mãe tiver
  um, sem exigir ajuste no helper.
- `PermissionDefinition` ganha dois campos opcionais (`scopable`,
  `sensitive`), ambos aditivos e com default que preserva o catálogo
  atual inteiro sem mudança de comportamento.
- O mapeamento "qual papel vê qual categoria" (escopo `ROLE`) é sempre
  regra do módulo de domínio que o declarar — nunca entra em `core/`,
  mesma fronteira do `AGENTS.md` §4.4.
- Este ADR não abre `core/` para a U8; abrir `core/` para a implementação
  futura exige sua própria autorização (ADR ou ampliação do ADR 0014),
  no momento em que o Atendimento Social existir.
