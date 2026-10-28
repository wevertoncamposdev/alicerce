# Alicerce — Finalização da base (v1.0)

> Origem: avaliação de 2026-10-27 (`develop` em 95f35b3). A Fase 12 já
> corrigiu C1, C2 e C3. Este roteiro fecha **só o que bloqueia o uso real** e
> encerra a evolução da base. Depois dele, o trabalho passa a ser o
> TerceiroGestor.
>
> **Regra deste roteiro:** nada entra aqui que não esteja abaixo. Ideia nova
> vai para `docs/backlog.md` com um gatilho, não para uma etapa.

## Visão geral

| # | Etapa | Por quê agora | Quem faz |
| --- | --- | --- | --- |
| F1 | Sessão revogada não renova (C4 / 12.5) | Última falha crítica de segurança | Claude Code |
| F2 | Remover permissão isolada + e-mail sem caixa | Bug de 500 e dado que fica caro de limpar depois | Claude Code |
| F3 | Compose, CI e onboarding (12.6) | Sem isso não há deploy | Claude Code |
| F4 | Limpeza rápida | Coisas pequenas que confundem ou expõem | Claude Code |
| F5 | Deploy real + backup testado | A base nunca rodou num servidor | Você (Claude prepara) |
| F6 | Encerrar planos e criar o backlog com gatilhos | Parar o crescimento da base | Claude Code |
| F7 | Processo enxuto | Deixar o dia a dia do produto mais leve | Claude Code + você |
| F8 | Tag v1.0 e repositório do TerceiroGestor | Começar o produto | Você |

Ordem: F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8. F1 a F4 são independentes entre
si; F5 depende de F3; F8 depende de todas.

**Checkpoint deste roteiro (Node 26):**

```bash
cd backend  && npx tsc --noEmit && npm run lint && npm test && npm run test:e2e && npm run test:e2e:db
cd frontend && npx tsc --noEmit && npm run lint && npm test && npm run build && npm run test:smoke
```

---

## F1 — Sessão revogada não renova (C4)

Executar exatamente a **etapa 12.5** de `docs/PLAN-fase-12.md`:

- `RefreshToken.replacedAt DateTime?` + migration.
- Na rotação, gravar `revokedAt` **e** `replacedAt`.
- Tolerância de 10 s só quando `replacedAt !== null`. Token revogado sem
  `replacedAt` (encerrar sessão, trocar senha, reset, desativação) → 401 e
  revoga a família.

**Aceite:** os dois `it.failing` de `test-db/sessions.db-spec.ts` viram `it`
e passam; o cenário de duas abas renovando juntas continua 200.

---

## F2 — Remover permissão isolada + e-mail sem caixa

### F2.1 Remover os endpoints de permissão isolada

`POST /roles/:id/permissions` dá 500 (o `upsert` usa `resource: null` numa
chave composta, que o Prisma 7.10 rejeita). Nenhuma tela usa esse endpoint
nem o `DELETE /roles/:id/permissions/:permissionId`: a matriz usa
`PUT /roles/:id/permissions`. Em vez de consertar, **remover**:

- Backend: as duas rotas em `roles.controller.ts`, `attachPermission` e
  `detachPermission` em `roles.service.ts`, o DTO
  `attach-role-permission` e os testes unitários correspondentes.
- Frontend: `attachRolePermission` e `detachRolePermission` em
  `modules/roles/actions/roleService.ts` (código morto).
- `test-db/rbac.db-spec.ts`: reescrever os 2 cenários para conceder pelo
  `PUT` da matriz e tirar o `it.failing`.
- Swagger/`openapi.json` regenerado.

**Aceite:** `rbac.db-spec.ts` passa sem `it.failing`; `knip` não acusa código
morto em `roles`.

### F2.2 E-mail sem diferenciar maiúsculas (12.9)

Fazer agora porque, com dados reais, a limpeza fica cara.

- `@NormalizeEmail()` (`trim().toLowerCase()` via `@Transform`) em todos os
  DTOs com `@IsEmail()`: `sign-in`, `sign-up-public`, `forgot-password`,
  `change-my-email`, `platform-login`, `create-user`, `update-user`,
  `create-tenant`.
- Migration `normalize_emails`: aborta se houver duplicata por
  `lower(trim(email))`; depois normaliza; depois
  `CHECK (email = lower(email))` em `users` e `platform_users`.

**Aceite:** os 2 `it.failing` de `email.db-spec.ts` viram `it` e passam.

---

## F3 — Compose, CI e onboarding (12.6)

Executar a **etapa 12.6** de `docs/PLAN-fase-12.md`:

- `prisma.config.ts` sem exigir `DATABASE_URL` no `prisma generate` →
  `npm ci` funciona num clone limpo e no CI.
- `docker-compose.yml`: `PLATFORM_JWT_SECRET`, serviço `migrate` de execução
  única (`migrate deploy` + `sync:permissions`) do qual o backend depende.
- `.env.example` da raiz com `PLATFORM_JWT_SECRET`.
- README: `nvm use` (Node 26) e o passo a passo de 5 comandos para subir tudo.

**Aceite:** clone limpo → `cp .env.example .env && docker compose up` →
`/api/health` ok, login com o usuário do seed pela tela; CI verde em todos os
jobs.

---

## F4 — Limpeza rápida

Um commit por item, na mesma branch.

1. **Dependências sem uso:** remover `@nestjs/platform-express`,
   `swagger-ui-express` e `@types/express` do backend (nenhum import no código).
2. **`/develop` fora de produção:** `notFound()` quando
   `NODE_ENV === "production"`.
3. **ID inválido dá 400, não 500:** `ParseUUIDPipe` nos `:id` dos controllers
   e no template de `scripts/new-module.mjs`. Tira o `it.failing` de
   `validation.db-spec.ts`.
4. **`manifest` de permissões:** remover `actionPermissions` de `permissions`
   em `alicerce.config.ts` (aponta para `permission.create/update/delete`, que
   não existem mais).
5. **Guia do novo módulo:** tirar a referência a `examples/features/notes`
   (removido) e apontar para `feedbacks/features/comments`.
6. **`backend/test/SETUP.md`:** reescrever (ainda descreve o "Projeto Study").

**Aceite:** checkpoint verde; `knip` limpo nos dois lados; `/develop` dá 404
no build de produção.

---

## F5 — Deploy real + backup testado

Feito por você, com o Claude preparando arquivos e checklist. O objetivo é a
base rodar **uma vez** num servidor de verdade antes de ter usuário.

Requisitos mínimos do ambiente:

- 1 container do backend, 1 do frontend, Postgres 17 e Redis.
- Postgres com backup automático do provedor (além do script do projeto).
- HTTPS no domínio do frontend; o backend não precisa ficar público (o
  navegador só fala com o Next).
- Secrets: `JWT_SECRET`, `PLATFORM_JWT_SECRET`, `COOKIE_SECRET` (três
  diferentes, `openssl rand -hex 32`), `MAIL_DRIVER` real (SMTP ou Resend).

Checklist (seguir `docs/deploy.md` e `docs/backup.md`, corrigindo-os no que
estiver errado):

- [ ] Role `app_runtime` criada fora das migrations (`docs/deploy.md` §4).
- [ ] `migrate deploy` + `sync:permissions` rodaram.
- [ ] Cadastro de uma instituição de teste pela tela, convite de um segundo
      usuário e aceite pelo e-mail real.
- [ ] `create:platform-user` e login em `/platform/login`.
- [ ] `backup:db` gerou um arquivo; `restore:db` desse arquivo num banco vazio
      e login funcionando nele.
- [ ] Smoke Playwright apontado para a URL de produção, verde.

**Aceite:** os 6 itens marcados e `docs/deploy.md`/`docs/backup.md` atualizados
com o que mudou na prática.

---

## F6 — Encerrar planos e criar o backlog com gatilhos

- Mover para `docs/historico/`: `Plano Base.md`, `docs/PLAN-fase-12.md`,
  `docs/features/Completo/` e este arquivo, quando terminar.
- `PLAN.md`: só "Agora" e "Próximo", sem histórico.
- Criar `docs/backlog.md` com a tabela abaixo. Item do backlog só vira tarefa
  quando o gatilho acontecer.

| Item | Origem | Gatilho para fazer |
| --- | --- | --- |
| IP e navegador reais no backend | 12.7 | Mais de ~5 pessoas fazendo login no mesmo minuto, ou 2ª instituição |
| Sessão atual reconhecida no perfil | 12.8 | Primeira reclamação de "caí depois de trocar a senha", ou 1º cliente pagante |
| `tenantId` fora dos DTOs | 12.10 | Próxima vez que mexer em `user` ou `role` |
| `RoleType` removido | 12.10 | Próxima vez que mexer em papéis |
| CNPJ alfanumérico | 12.10 | Primeira instituição com CNPJ no novo formato |
| Listas sem rolagem lateral no celular | 12.10 | Primeiro usuário usando pelo celular |
| `/auth/register` como página Server | 12.10 | Próxima mudança no cadastro |
| Sessão de plataforma revogável + auditoria de plataforma | 12.11 | Segunda pessoa com acesso de plataforma |
| Suspensão de tenant imediata | 12.12 | Primeira suspensão real (ex.: inadimplência) |
| Jobs com lock, throttle no Redis, MIME por bytes | 12.13 | Segunda réplica do backend |
| Billing | Fase 11 | Primeiro cliente pagante |
| Impersonação auditada, feature flags | Fase 11 | Primeiro pedido de suporte que exija |
| Escopo por registro (`.read.own`) | Avaliação | Conversa com a ONG mostrar que alguém só pode ver o que é seu |
| Campos data, CPF, telefone, moeda, seleção de registro | Avaliação | Módulo 1 do TerceiroGestor (fazer durante ele) |
| Gerador criando Feature filha | Avaliação | Módulo 2 do TerceiroGestor |

**Aceite:** `PLAN.md` com menos de 30 linhas; `docs/` com só ADRs, guia,
deploy, backup, roadmap/backlog, `ui/` e `historico/`.

---

## F7 — Processo enxuto

Atualizar `CLAUDE.md` e `AGENTS.md`:

- **Base congelada de verdade:** `core/` muda só por bug ou por pedido de um
  módulo, com uma linha no `CHANGELOG.md`. ADR só para decisão difícil de
  desfazer (troca de stack, modelo de dados central, segurança).
- **Processo proporcional ao risco:**

| Mudança | Processo |
| --- | --- |
| Dentro de um módulo (campo, tela, regra) | Commit direto + checkpoint rápido |
| Módulo novo | Plan mode curto + gerador + 1 teste de isolamento |
| `core/`, auth, RLS, migration destrutiva | Plan mode + checkpoint completo |
| Decisão difícil de desfazer | ADR |

- **Dois checkpoints:**
  - rápido (por commit): `tsc` + `lint` + testes do módulo tocado;
  - completo (antes de merge em `main`/deploy): o checkpoint deste roteiro.
- Remover as listas de arquivos autorizados por ADR do `CLAUDE.md` (ficam no
  histórico dos ADRs).

**Aceite:** `CLAUDE.md` com menos de 40 linhas; você revisou e concordou com o
texto.

---

## F8 — Tag v1.0 e repositório do TerceiroGestor

1. Merge do `develop` em `main` com o CI verde e tag `v1.0.0` no Alicerce.
2. Criar o repositório do TerceiroGestor **com o histórico do Alicerce** e o
   Alicerce como remote `alicerce` (não usar template do GitHub, que corta o
   vínculo). Atualizações da base chegam por `git merge` de uma tag nova do
   Alicerce. Mudança de `core/` se faz sempre no Alicerce, nunca direto no
   TerceiroGestor.
3. No TerceiroGestor: trocar nomes (`alicerce.config.ts`, títulos, e-mails),
   manter o módulo `feedbacks` como referência até o primeiro módulo real
   ficar pronto, e então removê-lo.
4. `PLAN.md` do TerceiroGestor começa com:
   "Agora: conversa com a ONG → campos de Pessoa atendida e Atendimento".

**Aceite:** os dois repositórios existem; o TerceiroGestor sobe com
`docker compose up` e mostra o próprio nome.

---

## Como pedir ao Claude Code

Primeira sessão (F1 + F2):

```text
Leia CLAUDE.md, AGENTS.md e docs/PLAN-finalizacao.md.
Execute F1 e depois F2 (F2.1 e F2.2), cada uma em plan mode curto: me
mostre o plano, espere meu ok, implemente. Comece sempre trocando o
it.failing do cenário por it e confirmando que falha pelo motivo
descrito; depois corrija até ficar verde. Rode o checkpoint do roteiro,
um commit por etapa (fix(auth), refactor(role), fix(auth)) e termine com
relatório curto: o que mudou, como testar, pendências.
```

Segunda sessão (F3 + F4):

```text
Leia CLAUDE.md, AGENTS.md e docs/PLAN-finalizacao.md.
Execute F3 e depois F4, um commit por item da F4. Não amplie o escopo:
qualquer coisa nova que encontrar vai para uma lista no relatório final,
não para o código. Rode o checkpoint do roteiro e termine com relatório
curto.
```

Terceira sessão (preparar F5):

```text
Leia docs/PLAN-finalizacao.md (F5), docs/deploy.md e docs/backup.md.
Vou fazer o deploy em <provedor>. Revise os dois documentos para esse
provedor, gere os arquivos de configuração que faltarem e me dê o
checklist da F5 adaptado, em ordem, com os comandos exatos. Não faça
deploy nem rode nada contra produção.
```

Quarta sessão (F6 + F7):

```text
Leia CLAUDE.md, AGENTS.md e docs/PLAN-finalizacao.md.
Execute F6 e F7. Em F7, me mostre o novo CLAUDE.md e as mudanças no
AGENTS.md antes de gravar. Commits docs(...). Relatório curto.
```

F8 é manual: merge, tag e criação do repositório do TerceiroGestor.
