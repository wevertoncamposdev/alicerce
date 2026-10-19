# Alicerce — Plano da base v1.1 → v2

> Consolidado em 2026-10-18 a partir da revisão do `develop` (84b766a).
> Junta: falhas de segurança, desvios da regra server-side, modelo de acesso,
> funcionalidades de base que faltam (perfil, instituição, e-mail, arquivos, LGPD)
> e migração das telas para o padrão novo de Detail.
>
> **Regra de execução:** cada etapa = 1 branch curta (ou 1 commit numa branch de fase),
> checkpoint completo antes do commit, Conventional Commits. Toda etapa que toca
> `backend/src/core/` ou `frontend/src/core/` cita o ADR que a autoriza.
>
> Checkpoint:
>
> ```bash
> cd backend  && npx tsc --noEmit && npm run lint && npm test && npm run test:e2e
> cd frontend && npx tsc --noEmit && npm run lint && npm run build
> ```

## Visão geral

| Fase | Tema | Por que nesta ordem | Etapas |
| --- | --- | --- | --- |
| 0 | Preparação e autorização | A base está congelada; sem ADR o próprio CLAUDE.md bloqueia | 2 |
| 1 | Segurança de autenticação e auditoria | Falhas reais hoje; tudo depois depende delas | 8 |
| 2 | Server-side e consistência do frontend | Pequeno, e evita que os padrões errados se espalhem | 6 |
| 3 | Modelo de acesso (RBAC) | As telas de usuários/papéis dependem do modelo certo | 6 |
| 4 | Perfil do usuário | Primeira funcionalidade de identidade, sem dependências externas | 5 |
| 5 | Instituição (tenant) | Idem; prepara a extensão de ONG do TerceiroGestor | 5 |
| 6 | Arquivos (mínimo) | Necessário para avatar e logo | 4 |
| 7 | E-mail e fluxos de conta | Convite e "esqueci a senha" são base de qualquer SaaS | 6 |
| 8 | Telas no padrão novo | Só depois do modelo de acesso e do convite | 7 |
| 9 | LGPD básica | Crítico para dados de pessoas atendidas (TerceiroGestor) | 4 |
| 10 | Operação e produção | Fecha a v1.1: dá para colocar no ar com segurança | 6 |
| 11 | v2 sob demanda | Management e Billing, puxados pelo TerceiroGestor | 2 blocos |

**Base pronta para o primeiro projeto real = Fases 0–10.**

---

## Fase 0 — Preparação e autorização

### 0.1 ADR 0006 — Base v1.1

- Registrar que a base sai do congelamento para esta lista de fases, com o escopo de
  arquivos de `core/` que cada fase pode tocar.
- Atualizar `CLAUDE.md` (seção de congelamento) e `PLAN.md` (apontar para este plano).
- **Aceite:** documento revisado; nenhuma mudança de código.

### 0.2 Linha de base de testes

- Rodar o checkpoint completo no `develop` e registrar o que já falha (se algo falhar).
- Criar `backend/test/helpers/` com fábricas de tenant/usuário/papel reutilizáveis
  pelos e2e das próximas fases (se os testes atuais repetem esse setup).
- **Aceite:** checkpoint verde; helper usado por pelo menos um e2e existente.

---

## Fase 1 — Segurança de autenticação e auditoria

### 1.1 Bloquear usuário inativo, excluído ou de tenant inativo

- `AuthService.signIn` e `refreshTokens`: recusar se `user.deletedAt != null`,
  `user.status !== 'ACTIVE'` ou `tenant.status !== 'ACTIVE'` (ou `tenant.deletedAt`).
- Mesma mensagem genérica de credenciais inválidas no login; 401 no refresh.
- **Aceite (e2e):** usuário desativado não loga; usuário excluído não loga;
  usuário com sessão aberta é desativado → o próximo refresh falha.

### 1.2 Revogar sessões ao desativar, excluir ou trocar senha

- Helper `AuthService.revokeAllSessions(userId)` (updateMany em `refreshToken`).
- Chamar em `UserService.update` (status ≠ ACTIVE ou senha alterada) e `UserService.remove`.
- Invalidar também o cache de permissões do usuário.
- **Aceite (e2e):** depois da troca de senha pelo admin, o refresh token antigo falha.

### 1.3 Login sem enumeração de usuários

- Uma única mensagem para e-mail inexistente e senha errada.
- Tempo constante: quando o e-mail não existe, rodar `bcrypt.compare` contra um hash
  fixo pré-calculado.
- **Aceite:** teste unitário confirma mesma mensagem e mesma chamada de `bcrypt.compare`.

### 1.4 Remover criação pública de tenant

- Remover `@Public() POST /tenant` (o onboarding é `/auth/register`).
- Criação de tenant fora do onboarding fica reservada ao futuro `management`.
- **Aceite (e2e):** `POST /tenant` sem token → 401; com token de admin de tenant → 403/404.

### 1.5 Auditoria sem segredos e sem ruído

- `sanitizePayload` recursivo removendo `password`, `newPassword`, `currentPassword`,
  `access_token`, `refresh_token`, `token`, `secret` em qualquer nível.
- Não auditar `POST /auth/refresh`.
- Falha ao gravar auditoria vai para `logger.error` (hoje é engolida).
- Migration de limpeza: remover `access_token` dos registros de auditoria já gravados
  (ou anonimizar o campo `after` dos registros `LOGIN`).
- **Aceite:** e2e de login → registro de auditoria não contém `access_token`;
  refresh não gera registro.

### 1.6 Bloqueio por conta (além do throttle por IP)

- Contador de falhas por e-mail no Redis: 5 falhas em 15 min → bloqueio de 15 min.
- Sem Redis: cai para o comportamento atual (só throttle por IP), com aviso no log.
- O bloqueio responde com a mesma mensagem genérica; auditar `LOGIN_FAILED` com motivo.
- **Aceite:** teste unitário do contador; e2e com 6 tentativas.

### 1.7 Política mínima de senha

- Centralizar em um validator: mínimo 8 caracteres, rejeitar senha igual ao e-mail.
  (Lista de senhas vazadas fica como melhoria futura.)
- Aplicar em cadastro, criação de usuário e troca de senha.
- **Aceite:** testes do validator.

### 1.8 Pequenas correções

- `UpdateUserDto.status`: `@IsIn(['ACTIVE','INACTIVE'])`.
- `AuthGuard`: tipos do Fastify (AGENTS §4.2.8), não do Express.
- **Aceite:** checkpoint verde.

---

## Fase 2 — Server-side e consistência do frontend

A regra continua: Server Components para leitura, Server Actions → DataProvider para
escrita, `"use client"` só em ilhas interativas (AGENTS §4.1).

### 2.1 Status do Feedback via Server Action

- `modules/feedbacks/config/status-action.ts` (`'use server'`, `apiServer.patch`).
- `FeedbackStatusControl` deixa de importar `apiClient`.
- **Aceite:** mudar status funciona; nenhum `apiClient` no módulo feedbacks.

### 2.2 Associação de papéis e permissões via Server Actions

- `modules/roles/actions/roleService.ts` vira `'use server'` com `apiServer`.
- **Aceite:** associar/remover papel e permissão funciona nas telas atuais.

### 2.3 Busca do RelationPicker via Server Action

- Server Action genérica de busca (`searchRecordsAction(model, args)`) que usa o DataProvider.
- `RelationPicker` deixa de chamar `apiClient.get`.
- **Aceite:** picker busca e pagina como hoje.

### 2.4 Limpeza de fronteiras client

- Remover `"use client"` de `DetailShell.tsx` (não usa hooks).
- Remover o caminho `list` (fetch em `useEffect`) do `RelationCrudHost` e do `relation-host`
  — todas as relações já chegam do servidor.
- **Aceite:** build sem mudança visual.

### 2.5 Lint que impede regressão

- `no-restricted-imports` para `@lib/api-client` em `src/modules/**`, `src/core/**`,
  `src/components/**`. Exceções só com comentário apontando o AGENTS.md.
- Atualizar AGENTS §4.1 citando a regra de lint.
- **Aceite:** lint verde; um import proibido de teste falha o lint.

### 2.6 Rascunho único na criação pelo Detail

- Hoje cada seção do `DetailCreateScreen` vira um `FormView mode="draft"` separado
  (cada um com seu `idRef`): seção sem o campo `primary` nunca salva.
- `DraftProvider` (client) em volta do grid: um único estado de valores, um único
  controlador de autosave; as seções só renderizam seus campos.
- Unificar o cálculo de grid de colunas com `DetailSections` (hoje duplicado).
- **Aceite:** showcase com 2+ seções: preencher campo da seção 2, depois o `primary`
  na seção 1 → um único registro criado com os dois valores.

---

## Fase 3 — Modelo de acesso (RBAC)

Modelo alvo: **permissões vêm do código** (catálogo), **papéis são pacotes de permissões
por tenant**, **rotas checam só permissões**.

### 3.1 ADR 0007 — Modelo de acesso

- Registrar: catálogo como fonte única; permissões somente leitura na UI;
  papéis com `isSystem`; fim do `@Roles`; roles fora do JWT.
- **Aceite:** documento revisado.

### 3.2 Rotas checam só permissões

- Remover `@Roles(...)` de todos os controllers; `RolesPermissionsGuard` passa a
  avaliar apenas `@Permissions`.
- **Aceite (e2e):** papel personalizado "Coordenador" com só `feedback.read` e
  `user.read` acessa essas rotas e recebe 403 em `role.read`.

### 3.3 Catálogo sincronizado e permissões somente leitura

- Script/serviço `syncPermissionCatalog()` idempotente: cria permissões novas do
  catálogo em todos os tenants (rodar no deploy e no seed).
- Remover endpoints `POST/PATCH/DELETE /permissions` e as permissões
  `permission.create/update/delete` do catálogo (migração remove as linhas).
- **Aceite:** adicionar uma permissão ao catálogo + rodar o sync → aparece em todos os tenants.

### 3.4 Papéis de sistema

- `Role.isSystem Boolean @default(false)`; migração marca o ADMIN inicial de cada tenant.
- Papel de sistema: não pode ser excluído nem renomeado; o ADMIN sempre recebe todas as
  permissões concedíveis do catálogo (re-sincronizado pelo `syncPermissionCatalog`).
- `RoleType` deixa de ser usado pela autorização (manter a coluna até a 3.6).
- Regra "não remover o último admin" passa a olhar `isSystem`.
- **Aceite (e2e):** DELETE no papel ADMIN → 409; regra do último admin continua valendo.

### 3.5 Matriz de permissões do papel

- `GET /roles/:id/permission-matrix` → recursos × ações com marcado/desmarcado.
- `PUT /roles/:id/permissions` em lote (substitui o conjunto), auditado como
  `PERMISSION_CHANGE`, invalida cache dos usuários do papel.
- **Aceite (e2e):** salvar a matriz e conferir permissões efetivas de um usuário do papel.

### 3.6 Limpeza

- Remover `roles` do payload do JWT e do `AuthUserContext` no frontend (passar a usar
  só permissões); remover `RoleType` (migration) se não houver mais uso.
- **Aceite:** grep sem `@Roles`/`RoleType` na autorização; checkpoint verde.

---

## Fase 4 — Perfil do usuário

### 4.1 Nome do usuário

- `User.name String?` (migration); `name` no cadastro público e na criação de usuário.
- Exibir nome (fallback: e-mail) na sidebar, tabelas e auditoria.
- **Aceite:** nome aparece nas telas; e-mail continua como identificador de login.

### 4.2 Metadados de sessão

- `RefreshToken`: `userAgent`, `ip`, `lastUsedAt` (gravados no login e no refresh).
- **Aceite:** campos preenchidos nos e2e de login/refresh.

### 4.3 Endpoints "eu" (`/me`)

- `GET/PATCH /me` (nome, preferências: tema, idioma), sem exigir `user.update`.
- `POST /me/password` (exige senha atual; revoga as outras sessões).
- `GET /me/sessions`, `DELETE /me/sessions/:familyId`, `DELETE /me/sessions` (encerrar todas
  menos a atual).
- Troca de e-mail fica para a Fase 7 (precisa de confirmação por e-mail).
- **Aceite (e2e):** cada endpoint, incluindo senha atual errada → 400.

### 4.4 Tela "singleton" no core

- `SingletonDetailScreen` (ou modo de `DetailViewScreen`) para páginas de um registro só,
  sem lista: recebe um loader e um `detailLayout`. Reusada pelo perfil e pela instituição.
- **Aceite:** renderiza com header, seções e autosave; sem breadcrumb de lista.

### 4.5 Página `/perfil`

- Menu do usuário (rodapé da sidebar) → Perfil.
- Seções: Dados (nome, e-mail em leitura), Segurança (trocar senha), Sessões ativas
  (lista com "encerrar"), Preferências.
- **Aceite:** Playwright 1440/375; trocar senha derruba outra sessão aberta.

---

## Fase 5 — Instituição (tenant)

### 5.1 Campos genéricos da instituição

- `Tenant`: `tradeName`, `documentType` (CNPJ/CPF/outro), `document`, `email`, `phone`,
  `website`, endereço (campos simples), `slug` imutável após criação.
- Validação de CNPJ/CPF no backend quando informado.
- Dados específicos de ONG **não** entram aqui (ADR 0003): no TerceiroGestor viram
  Extensão de Módulo 1:1.
- **Aceite:** migration + testes do validator.

### 5.2 Endpoints da instituição atual

- `GET/PATCH /tenant/current` (`tenant.read` / `tenant.update`), sem `:id` na URL.
- Rotas `/tenant/:id`, `search` e `DELETE` ficam só para o futuro `management`.
- **Aceite (e2e):** admin lê e atualiza a própria instituição; não há como apontar outra.

### 5.3 Termo configurável

- `alicerce.config.ts`: `terms: { tenant: "Instituição" }` usado em menu, títulos e cadastro.
- **Aceite:** trocar o termo para "Empresa" muda todos os rótulos.

### 5.4 Página `/configuracoes/instituicao`

- Usa a `SingletonDetailScreen` da 4.4: seções Identificação, Contato, Endereço.
- Remover "Tenants" (lista) do menu do tenant.
- **Aceite:** Playwright 1440/375; autosave em todos os campos.

### 5.5 Cadastro público coerente

- `/auth/register` pede nome da pessoa, nome da instituição; slug gerado e editável.
- **Aceite:** e2e de cadastro com os campos novos.

---

## Fase 6 — Arquivos (mínimo)

### 6.1 ADR 0010 — Storage

- Interface `StorageProvider` (`put`, `getSignedUrl`, `delete`); adapters: disco local (dev)
  e S3-compatível (produção, ex.: R2/S3/MinIO). Nenhum código fora do adapter conhece o provedor.
- **Aceite:** documento revisado.

### 6.2 Model e serviço de arquivos

- `File` tenant-scoped (RLS): `ownerType`, `ownerId`, `mime`, `size`, `key`, `uploadedById`.
- Limites de tamanho e whitelist de MIME por uso; nome de objeto aleatório.
- **Aceite (e2e):** upload, download por URL assinada, isolamento entre tenants.

### 6.3 Upload no frontend

- Server Action recebendo `FormData` → backend; componente de campo `image` no `FormView`.
- **Aceite:** campo funciona em um módulo de exemplo.

### 6.4 Avatar e logo

- `User.avatarFileId`, `Tenant.logoFileId`; header do perfil e da instituição usam a imagem;
  sidebar mostra logo e avatar.
- **Aceite:** Playwright 1440/375.

---

## Fase 7 — E-mail e fluxos de conta

### 7.1 ADR 0011 + `MailProvider`

- Interface com adapters: console (dev), SMTP, Resend (ou similar). Templates simples
  (HTML + texto) com nome/logo da instituição.
- Envio com retry; falha vai para log (fila em Redis é melhoria futura).
- **Aceite:** e-mail de teste aparece no console em dev.

### 7.2 Tokens de uso único

- Model `AccountToken`: `type` (INVITE, RESET_PASSWORD, VERIFY_EMAIL, CHANGE_EMAIL),
  `tokenHash`, `userId`, `expiresAt`, `usedAt`.
- **Aceite:** testes de criação, expiração e uso único.

### 7.3 Esqueci / redefinir senha

- `POST /auth/forgot-password` (resposta sempre igual), `POST /auth/reset-password`
  (revoga todas as sessões). Throttle estrito. Telas públicas.
- **Aceite (e2e):** fluxo completo; token usado duas vezes → falha.

### 7.4 Convite de usuário

- Admin informa e-mail, nome e papéis; o usuário recebe link e define a senha.
- Remover o campo de senha da criação de usuário pelo admin.
- Reenviar e cancelar convite; usuário convidado tem status `INVITED` (ou campo próprio).
- **Aceite (e2e):** convite → aceite → login com os papéis certos.

### 7.5 Verificação de e-mail no cadastro

- E-mail de verificação no `/auth/register`; aviso no app enquanto não verificar.
- **Aceite (e2e):** fluxo de verificação.

### 7.6 Troca de e-mail no perfil

- Confirmação no e-mail novo; aviso no e-mail antigo.
- **Aceite (e2e):** e-mail só muda após confirmação.

---

## Fase 8 — Telas no padrão novo

Seguem `docs/ui/detail-page.md` (ADR 0004/0005). Cada etapa: Playwright 1440/375 + dark mode.

### 8.1 Menu reorganizado

- Grupos: **Geral** (Dashboard, módulos de domínio) · **Configurações** (Instituição,
  Usuários, Papéis, Auditoria). Perfil no menu do usuário.
- **Aceite:** itens aparecem conforme permissão.

### 8.2 Usuários

- Header: avatar, nome, e-mail, status (badge com troca de status no header).
- Seções: Dados (autosave). Relações: Papéis (links), Permissões efetivas (leitura).
- Toolbar: reenviar convite, desativar. `createMode` = convite (não o rascunho genérico).
- **Aceite:** sem campo de senha em lugar nenhum da tela do admin.

### 8.3 Papéis

- Header com indicação de papel de sistema. Seção Dados (autosave; bloqueada se sistema).
- Aba **Permissões**: matriz recurso × ação com checkboxes e autosave (endpoint da 3.5).
- Relação Usuários (links). `createMode: "detail"`.
- **Aceite:** marcar uma permissão reflete no acesso de um usuário do papel em até 60 s.

### 8.4 Permissões

- Lista somente leitura agrupada por recurso, com descrição e em quais papéis está.
  (Alternativa: remover do menu e mostrar só dentro de Papéis.)
- **Aceite:** sem botões de criar/editar/excluir.

### 8.5 Auditoria

- Filtros na URL: usuário, entidade, tipo, período. Nome do usuário em vez de e-mail.
- Detail com diff before/after legível e link para o registro afetado.
- **Aceite:** filtros funcionam com paginação no servidor.

### 8.6 Drawer de metadados

- Ajustes visuais pendentes do `detail-page.md` §6 (blocos de criação/atualização,
  timeline colorida por ação, datas pt-BR).
- **Aceite:** comparação com a referência listando o que diverge.

### 8.7 Gerador e guia

- `new-module.mjs` e `docs/guia-novo-modulo.md` refletindo: permissões só por catálogo,
  `primary`, `createMode`, `toolbar`, `rowLink`, Server Actions, lint de `apiClient`.
- **Aceite:** gerar um módulo descartável, compilar, apagar.

---

## Fase 9 — LGPD básica

### 9.1 Termos e consentimento

- Model `ConsentRecord` (usuário, documento, versão, data, IP). Aceite no cadastro e
  quando a versão muda (bloqueio suave até aceitar).
- **Aceite (e2e):** nova versão → usuário precisa aceitar.

### 9.2 Exportar meus dados

- Perfil → "Exportar meus dados" (JSON do usuário, sessões, consentimentos, registros criados).
- **Aceite:** arquivo gerado contém só dados do próprio usuário.

### 9.3 Anonimização em vez de exclusão física

- Excluir usuário = anonimizar nome/e-mail, manter vínculos e auditoria.
- Padrão documentado para módulos de domínio com dados pessoais (`anonymize()` no service).
- **Aceite:** e-mail liberado para reuso após anonimização.

### 9.4 Retenção de auditoria

- Prazo configurável por env; job de expurgo (depende da 10.1).
- **Aceite:** teste do job com dados antigos.

---

## Fase 10 — Operação e produção

### 10.1 Jobs agendados

- `@nestjs/schedule`: limpar refresh tokens e `AccountToken` expirados; retenção de auditoria.
- **Aceite:** testes unitários dos jobs.

### 10.2 Monitoramento de erros

- Adapter opcional (ex.: Sentry) ligado por env no backend e no frontend.
- **Aceite:** erro de teste aparece no painel em staging.

### 10.3 Cabeçalhos e CSP no frontend

- CSP, `frame-ancestors`, `Referrer-Policy`, `Permissions-Policy` no Next.
- **Aceite:** verificação com securityheaders ou similar.

### 10.4 Páginas de erro e carregamento

- `loading.tsx`, `error.tsx`, `not-found.tsx` no grupo `(app)` e nas rotas de detalhe.
- **Aceite:** 404 de registro inexistente mostra a página certa.

### 10.5 Deploy de referência

- Documentar e testar: build, migrações (`migrate deploy` + criação da role de runtime fora
  das migrations), `syncPermissionCatalog`, variáveis, Redis, storage, e-mail.
- **Aceite:** subir um ambiente de staging seguindo só o documento.

### 10.6 Backup e restauração

- Rotina de backup do Postgres e teste de restauração documentado.
- **Aceite:** restauração executada uma vez em staging.

---

## Fase 11 — v2 (sob demanda, puxada pelo TerceiroGestor)

### Management mínimo (antes do primeiro cliente externo)

- Pré-requisito: ADR de "usuário da plataforma" (fora dos tenants) e autenticação separada.
- Lista de tenants com status e uso; suspender/reativar (usa o check da 1.1).
- Caixa única de feedbacks de todos os tenants.
- Depois: impersonação auditada, feature flags.

### Billing (quando houver o primeiro cliente pagante)

- Seguir o desenho do `docs/roadmap.md`: `PaymentProvider`, webhooks idempotentes,
  entitlements com `@RequiresEntitlement()`. Escolha do gateway (Asaas, Mercado Pago, Stripe)
  depende do cliente.

---

## Como pedir cada etapa ao Claude Code

```text
Leia CLAUDE.md, AGENTS.md e docs/PLAN-base.md.
Execute a etapa <N.M> — <título>. Comece em plan mode e espere meu ok.
Respeite o escopo de arquivos do ADR citado na fase. Rode o checkpoint,
faça um commit `<tipo>(<escopo>): ...` e termine com relatório curto
(o que mudou, como testar, pendências). Em mudança visual, screenshots
Playwright 1440 e 375 comparados com a referência.
```
