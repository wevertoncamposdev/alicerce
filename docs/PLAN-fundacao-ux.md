# Alicerce — Fundação de UX (v1.1)

> Origem: revisão de 2026-10-28 (`develop` em b5fe765) a pedido do
> Weverton, olhando a base pelos módulos que o TerceiroGestor vai ter
> (Pessoas, Atendimento Social, Atividades, Grupos, Parceiros, Financeiro,
> Transparência, Relatórios…). O objetivo é fechar **agora** o que é
> mecanismo de todo módulo — lista, detalhe, formulário, relações,
> metadados, linguagem e arquivos — para que nenhum módulo do produto
> precise ser refeito depois.
>
> **Regra desta fase:** só entra o que é mecanismo genérico (serve para
> qualquer módulo de qualquer produto). Domínio de ONG fica no
> TerceiroGestor. Cada etapa toca `core/` e por isso fica coberta pelo
> **ADR 0014** (U0.0) e por uma linha no `CHANGELOG.md`.
>
> **Portão de decisão:** depois da U1 (demo em JSON) você aprova o visual
> por screenshots. Só então as etapas U2–U6 viram backend real. O que não
> aparecer na demo não entra nesta fase.

---

## 1. O que a revisão encontrou

### Defeitos reais (reproduzidos contra o app rodando)

| # | Sintoma que você viu | Causa confirmada | Onde |
| --- | --- | --- | --- |
| D1 | Nome do usuário não salva | `UpdateUserDto` não tem `name`; com `forbidNonWhitelisted`, todo autosave do nome volta 400 | `modules/user/dto/update-user.dto.ts` |
| D2 | Instituição não salva quando o formulário é preenchido | O autosave manda **a seção inteira** a cada alteração, com `""` nos campos vazios. `documentType: ""`, `email: ""` e `logoFileId: ""` reprovam o lote todo (400) e a tela só diz "Falha ao salvar" | `FormView.tsx` (motor) + DTOs |
| D3 | CNPJ com máscara e UF por extenso rejeitados | Validador só aceita dígitos; UF `MaxLength(2)` sem lista; nenhum campo normaliza máscara | `is-document.validator.ts`, `update-tenant.dto.ts` |
| D4 | Brecha: CNPJ inválido salvo | Salvar só `document` (sem `documentType` no mesmo payload) pula a validação do dígito | `is-document.validator.ts` |
| D5 | Erro de campo some em produção | `disableErrorMessages: isProduction` no `ValidationPipe` — em produção o front nunca sabe qual campo falhou | `main.ts` |
| D6 | Imagem enviada não aparece | O arquivo sobe, mas a URL aponta para o backend (`localhost:5000/...`), que a CSP `img-src 'self'` bloqueia; no Railway o backend é privado e a URL nem é alcançável | `local-disk.provider.ts`, CSP |
| D7 | Foto acima de 1 MB dá 500 | Limite padrão da Server Action do Next é 1 MB; o backend aceita 5 MB | `next.config.ts` |
| D8 | Smoke dizia que o upload funcionava | O teste só confere o `src` da `<img>`, não se ela carregou | `e2e/smoke.spec.ts` |
| D9 | Ícones do app quebrados deslogado | `matcher` do `src/proxy.ts` só exclui `favicon.ico`; `icon.png`, `site.webmanifest` etc. redirecionam para o login | `src/proxy.ts` |
| D10 | Teste de bloqueio marcado como falho | Faz 5 tentativas; o `account_locked` só é gravado na 6ª (o código está certo) | `test-db/audit.db-spec.ts` |
| D11 | Dois banners em toda tela no dev | Seed não grava `emailVerifiedAt` nem o aceite dos termos | `prisma/seed.ts` |
| D12 | Barra lateral corta em telas longas | Fundo do sidebar termina em 900 px | `AppSidebar.tsx`/layout |

### Linguagem técnica na tela

- Auditoria mostra `POST auth`, `PATCH tenant`, `PATCH me` e UUIDs crus; o
  detalhe mostra JSON (`{"id":"01a1…","permissions":[…]}`).
- Histórico no drawer mostra nomes de coluna (`description`, `updatedAt`).
- Permissões agrupadas por nomes em inglês (`Audit`, `Roles`, `Tenants`) e
  com `user.create`; uma descrição ainda cita "Fase 7".
- Status cru na lista (`ACTIVE`), coluna "Tenant ID" com UUID, nome do
  usuário mostra o e-mail quando vazio.

### Distância da referência visual

`docs/ui/reference/detail-layout.png` já desenha o destino (seções em cards
em até 3 colunas, tags, observações, relações com contagem, drawer com
Auditoria/Tags/Notas/Anexos). Hoje o detalhe é uma lista simples
rótulo/valor, há dois sistemas de abas (cabeçalho e rodapé) e o drawer
repete "criado em" três vezes.

---

## 2. Fronteira Alicerce × TerceiroGestor

**Critério:** se outro produto qualquer (uma clínica, uma escola, um
escritório) usaria o mecanismo sem mudar nada, é Alicerce. Se tem nome ou
regra de ONG, é TerceiroGestor.

| Tema | Alicerce (base) | TerceiroGestor (produto) |
| --- | --- | --- |
| Instituição | Tenant **mínimo e universal**: razão social, nome fantasia, documento, contato, endereço, logo | Módulo `perfil-institucional` como **Extensão 1:1** do tenant: registros (CMAS, CEBAS, utilidade pública), CNAE, missão, diretoria, dados para página pública |
| Pessoa / usuário | User **mínimo**: nome, e-mail, avatar, telefone, status, idioma, tema | Módulo `pessoas` com `userId` opcional (1:1): uma Pessoa pode existir sem login (atendido), e todo usuário da equipe aponta para sua Pessoa |
| Notas, tags, anexos | Recursos **polimórficos** de qualquer registro, ligados por `entity` + `entityId` (mesmo padrão de `Audit` e `File`), ativados por módulo no contrato | Só liga `metadata: { notes, tags, attachments }` nos módulos |
| Histórico | Auditoria humanizada por registro (quem, quando, o que mudou, em português) | — |
| Linha do tempo da pessoa | Contrato genérico de **timeline**: módulos contribuem eventos para um registro alvo | Atendimentos, presenças e vínculos alimentam a timeline da Pessoa |
| Sigilo | **Acesso por registro** (ex.: `atendimento.read.own`, visibilidade restrita a um papel) + auditoria de leitura para dados sensíveis | Atendimento Social usa isso (prontuário de psicologia e serviço social) |
| Campos | Tipos: data, data/hora, moeda (centavos), CPF/CNPJ, telefone, CEP, seleção de registro (lookup), múltipla escolha, tags | Quais campos cada módulo tem |
| Listas | Colunas tipadas (badge, data, link para registro, avatar+nome, tags), rolagem horizontal, primeira coluna fixa, escolha de colunas, exportar CSV | Quais colunas |
| Navegação | Tudo é TypeView ou DetailView; links entre registros; trilha de navegação | — |
| Funcionários, voluntários, diretoria, atendidos | — | **Não são módulos**: são **vínculos** da Pessoa (Feature `vinculos` com tipo, início e fim) e visões filtradas de Pessoas. Evita cadastrar a mesma pessoa 4 vezes |
| Grupos, Atividades, Presença | — | Módulos do produto (Grupo N:N Pessoa; Atividade com Feature `presencas`) |
| Parceiros | — | Módulo `organizacoes` (pessoas jurídicas) |
| Financeiro, Transparência, Relatórios | Base dá: valores em centavos, anexos, exportar CSV | Regras e telas do produto |
| Chat interno, notificações | Fica no `docs/roadmap.md` (fora desta fase) | — |

**Sobre o tenant:** a resposta é *tenant mínimo no Alicerce + Extensão no
TerceiroGestor*. O tenant é lido em toda requisição (RLS, cache de
permissões) e é compartilhado por qualquer produto; inchar o model com
campos de ONG obrigaria outros produtos a carregar colunas que não usam e
tornaria cada merge do upstream um conflito. A Extensão 1:1 já existe na
taxonomia do `AGENTS.md` (§4.3); a U7 só a transforma num padrão pronto, e
a tela `/configuracoes/instituicao` passa a mostrar as seções da extensão
quando o produto declarar uma.

**Sobre o usuário:** o mesmo raciocínio. `User` é **acesso** (login,
papel, sessão); `Pessoa` é **identidade** (documentos, família, histórico).
O mínimo do User fica pronto e salvando aqui; o resto vive na Pessoa.

---

## 3. A demo em JSON — vale a pena?

**Sim, com uma condição: a demo precisa usar os contratos reais.** Uma tela
"de mentira" desenhada à parte vira um segundo design que ninguém mantém. O
showcase atual (`modules/develop/showcase`) já é meio caminho: contrato
real com um provider em memória.

A proposta é evoluir isso para uma **Demo com três módulos ligados entre
si** — Pessoas, Atividades e Atendimentos — com dados em JSON, servidos por
um `createJsonDataHandlers()` que implementa a mesma interface
`RecordModuleDataHandlers` dos módulos REST (busca, filtro, ordenação,
paginação e edição em memória). Assim:

- você navega de verdade: Pessoa → atividade → outra pessoa → atendimento,
  sempre entre TypeView e DetailView;
- cada mecanismo novo do motor (colunas tipadas, campos novos, drawer com
  notas/tags/histórico, relações com link) nasce testado na demo;
- quando o TerceiroGestor criar `pessoas`, o contrato da demo é o ponto de
  partida: troca-se o provider JSON pelo REST.

Limite honesto: JSON não testa backend. Por isso cada mecanismo que tem
dado (notas, tags, histórico, upload) também é entregue com backend real e
teste contra Postgres, usando o módulo `feedbacks` como primeiro
consumidor.

A demo roda em dev e, opcionalmente, com `DEMO_MODE=true` num deploy de
preview. Nomes de domínio ficam só em `modules/develop/demo/`, nunca em
`core/`.

---

## 4. Etapas

| Etapa | O quê | Toca `core/` | Depende de |
| --- | --- | --- | --- |
| U0 | Correções D1–D12 → tag `v1.0.0` | Sim | — |
| U1 | Demo JSON (Pessoas, Atividades, Atendimentos) — **portão** | Sim (provider JSON) | U0 |
| U2 | Linguagem: rótulos, status com badge, auditoria e permissões humanizadas | Sim | U1 |
| U3 | TypeView v2 (lista) | Sim | U1 |
| U4 | DetailView v2 (seções + formulário + campos novos) | Sim | U1 |
| U5 | Relações v2 + navegação | Sim | U3, U4 |
| U6 | Metadados v2: Notas → Tags → Histórico | Sim + backend | U2, U4 |
| U7 | Tenant e User mínimos + padrão de Extensão 1:1 | Sim | U4 |
| U8 | ADR de acesso por registro e dados sensíveis | Não (só ADR) | — |
| U9 | Gerador e guia atualizados → tag `v1.1.0` | Não | U2–U7 |

---

### U0 — Correções antes de tudo

**U0.0 ADR 0014 — Fundação de UX.** Escopo de `core/` desta fase (lista de
pastas por etapa) e as decisões da seção 2. Atualiza `CLAUDE.md` com a
referência.

**U0.1 Nome do usuário (D1).** `name` (`IsOptional`, `MaxLength(120)`) em
`UpdateUserDto`. Teste em `test-db`: editar o nome pela API persiste.

**U0.2 Autosave robusto (D2, D4, D5) — motor, vale para todo módulo.**

- Front (`FormView`): mandar **só os campos alterados** desde o último
  salvamento; campo opcional vazio vai como `null`, nunca `""`.
- Back: `IsOptional` aceita `null` para limpar o campo; DTOs de update sem
  campos derivados (`logoFileId` só via upload).
- Validação cruzada no **service**, contra o registro salvo mesclado com o
  payload (ex.: documento × tipo), não só no DTO.
- Erros estruturados: o backend devolve `{ field, message }` em português
  também em produção (nome de campo e mensagem de validação não são
  sensíveis; esconder stack e detalhes internos continua valendo). O front
  mostra o erro **no campo**, não só "Falha ao salvar".
- Teste vitest do `FormView` + teste `test-db` reproduzindo D2 e D4.

**U0.3 Máscaras (D3).** Normalizadores reutilizáveis em
`core/common/transformers` (`OnlyDigits` para CPF/CNPJ/CEP/telefone, `Uf`
validando a lista de 27 UFs, `TrimToNull`). Aplicar no tenant e no user.

**U0.4 Arquivos de ponta a ponta (D6, D7, D8).**

- Backend: `GET /files/:id/content` (autenticado, tenant-scoped) que
  devolve os bytes (driver `local`) ou um 302 para URL assinada de curta
  duração (driver `s3`, inclusive Cloudflare R2).
- Front: as URLs de preview passam a ser same-origin
  (`/api/proxy/files/<id>/content`) → funciona com backend privado e com a
  CSP `'self'`. Se usar redirect para R2, incluir o host do bucket em
  `img-src`.
- `next.config.ts`: `serverActions.bodySizeLimit` = limite do backend; e
  redimensionar imagem no navegador antes de enviar (avatar/logo até
  ~512 px, WebP).
- Smoke: conferir `naturalWidth > 0` da imagem, não só o `src`.
- `docs/deploy.md`: bloco "Cloudflare R2" (`STORAGE_DRIVER=s3`,
  `S3_ENDPOINT`, bucket privado).

**U0.5 Pequenos (D9–D12).** `matcher` excluindo arquivos com extensão;
6ª tentativa no teste de bloqueio; seed com e-mail verificado e termos
aceitos; altura do sidebar; nomes dos grupos de permissão e texto "Fase 7".

**Aceite U0:** checkpoint completo verde; os 12 itens reproduzidos como
teste; instituição preenchida campo a campo pela tela salva tudo; avatar de
3 MB aparece. Merge em `main` + tag **`v1.0.0`**.

---

### U1 — Demo JSON (portão de decisão)

- `core/data-provider/json.ts`: `createJsonDataHandlers(seed, options)` com
  busca, filtros, ordenação, paginação e edição em memória (por sessão do
  servidor de dev). Mesma interface dos handlers REST.
- `modules/develop/demo/`: três contratos ligados —
  **Pessoas** (~40 registros: nome, foto, nascimento, CPF, telefone,
  endereço, vínculos com tipo/período, tags), **Atividades** (~8: música,
  capoeira…, com participantes e presenças), **Atendimentos** (~60: data,
  tipo social/psicológico, profissional, pessoa, situação, sigiloso sim/não).
- Rotas `/develop/demo/<modulo>` e `/develop/demo/<modulo>/[id]`, visíveis
  em dev e com `DEMO_MODE=true`.
- Cada etapa U2–U6 implementa primeiro na demo, depois no backend real.
- **Aceite:** você navega Pessoa ↔ Atividade ↔ Atendimento só por links, em
  1440 e 375 px; screenshots aprovados por você; decisões registradas em
  `docs/ui/detail-page.md` e num novo `docs/ui/list-page.md`.

---

### U2 — Linguagem: nada técnico na tela

- **Rótulos vêm dos contratos.** Cada módulo já declara `label` e os
  `label` dos campos; um `core/registry/labels.ts` expõe
  `entityLabel(entity)`, `fieldLabel(entity, field)` e
  `recordTitle(entity, record)`. Auditoria, permissões e histórico usam
  isso.
- **Ações em português:** `POST` → "Criou", `PATCH`/`PUT` → "Alterou",
  `DELETE` → "Removeu", `LOGIN` → "Entrou", `LOGIN_FAILED` → "Tentativa de
  acesso recusada"; nunca exibir verbo HTTP.
- **Auditoria:** linha = "Ana alterou **Descrição** e **Situação** em
  Feedback *Cadastro de famílias está lento*"; registro afetado é link
  para o detalhe; diff só com campos de negócio (sem `updatedAt`, `id`,
  `tenantId`) e valores formatados (datas, enums, nomes de registros).
- **Permissões:** agrupadas pelo `label` do módulo, ação em português
  ("Feedbacks › Criar"), `user.create` só como texto auxiliar pequeno.
- **Enums com cor:** `defineEnum("FeedbackStatus", { RECEIVED: { label:
  "Recebido", tone: "neutral" }, … })` no contrato; badge usa `tone`
  (neutral, info, success, warning, danger). Vale para status de usuário,
  papel, tenant e qualquer módulo.
- **Aceite:** busca no HTML das telas por `POST|PATCH|PUT|DELETE|ACTIVE|
  [0-9a-f]{8}-[0-9a-f]{4}` não encontra nada visível ao usuário (teste no
  smoke).

---

### U3 — TypeView v2 (lista)

- Tipos de coluna declarados no contrato: `text`, `title` (avatar + nome +
  subtítulo, é o link do registro), `badge` (usa o enum), `date`,
  `datetime`, `money`, `relation` (nome do registro ligado, com link),
  `tags`, `count`.
- Tabela com **rolagem horizontal dentro do container**, primeira coluna
  fixa, cabeçalho fixo, linha inteira clicável (com `<a>` real para abrir
  em nova aba), densidade confortável/compacta.
- Escolha de colunas visíveis (persistida na URL como o resto do estado).
- Filtros rápidos por badge (chips) e exportar CSV do resultado filtrado
  (respeita permissão de leitura).
- Remover colunas técnicas das listas atuais (`Tenant ID`).
- **Aceite:** smoke a 375 px sem rolagem da página (só da tabela) — reativa
  o teste hoje pulado; lista de Pessoas da demo com 8+ colunas legível.

---

### U4 — DetailView v2 (seções e formulário)

- Layout da referência: cabeçalho (avatar, nome, badges, linha de fatos),
  seções em **cards num grid de até 3 colunas**, cada card com ícone e
  título; uma única fileira de abas (Visão geral + abas do módulo).
- Formulário com rótulo em cima, campos lado a lado quando couber
  (`span: 1 | 2 | 3` por campo), ajuda e erro sob o campo, foco visível.
- Tipos novos de campo: `date`, `datetime`, `money` (centavos), `cpf`,
  `cnpj`, `document` (CPF/CNPJ conforme tipo), `phone`, `cep` (com busca
  de endereço opcional), `lookup` (seleciona outro registro com busca e
  mostra link), `multiselect`, `tags`.
- Campo somente leitura com o mesmo visual do editável (sem "modo editar").
- **Aceite:** Pessoa da demo idêntica em estrutura à referência; Feedback,
  Usuário, Papel e Instituição migrados para o novo layout.

---

### U5 — Relações v2 e navegação

- Relação = tabela compacta com as colunas tipadas da U3, **só os dados**,
  e o nome do registro como link para o detalhe dele; ações (associar,
  novo, remover) discretas no canto.
- Abas de relação com contagem; uma só barra de abas por tela.
- Ao abrir um registro a partir de uma relação, a trilha mostra o caminho
  (`Pessoas › Ana Lima › Música › Carlos Eduardo`), e voltar retorna para
  a aba e posição de onde veio.
- Lista volta com busca, filtros e página preservados (já na URL).
- **Aceite:** na demo, ida e volta Pessoa → Atividade → Pessoa sem perder
  contexto; nenhuma tela além de TypeView/DetailView no caminho.

---

### U6 — Metadados v2: Notas, Tags, Histórico

Ordem no drawer: **Notas → Tags → Histórico**. A aba Contexto sai; o topo
do Histórico traz um resumo de 3 linhas (criado por/em, última alteração,
situação) e logo abaixo a linha do tempo, que ocupa o resto da altura.

- **Backend polimórfico** (tenant-scoped, RLS, auditado):
  - `Note { entity, entityId, body, authorId, pinned, createdAt, updatedAt }`
    — editar/remover só o autor ou quem tem `<modulo>.update`.
  - `Tag { name, color }` por tenant + `RecordTag { tagId, entity, entityId }`
    — criar tag na hora, autocomplete, cor do enum de tons.
  - Permissão herdada do registro: quem lê o registro lê notas e tags; quem
    altera o registro cria/edita. Sem permissões novas no catálogo.
  - Registro removido → notas e tags removidas no mesmo fluxo de exclusão.
- **Contrato:** `metadata: { notes: true, tags: true, history: true,
  attachments: false }` por módulo; tags também aparecem como coluna (U3)
  e filtro.
- **Histórico** usa a linguagem da U2 (agrupado por dia, ator, campos em
  português, link para registros citados).
- Anexos (já há `File` polimórfico) ficam preparados no contrato, mas a
  aba só entra quando um módulo pedir.
- **Aceite:** Feedback com notas e tags reais (teste `test-db` de
  isolamento entre tenants para `Note` e `RecordTag`); demo com as três
  abas; drawer sem informação repetida.

---

### U7 — Tenant e User mínimos + Extensão 1:1

- Fechar o conjunto mínimo (seção 2) e garantir que **todos** os campos
  salvam pela tela (teste que preenche o formulário inteiro campo a campo).
- User ganha `phone` (opcional); `/perfil` e `/users/:id` com o layout U4.
- Padrão de **Extensão 1:1**: o gerador ganha
  `npm run new:module <nome> -- --extends=tenant` (ou `--extends=<modulo>`),
  que cria model com `id` = FK do pai, endpoints `GET/PATCH` sem lista e
  registra seções extras no detalhe do pai.
- Documentar em `docs/guia-novo-modulo.md` o caso "perfil institucional" e
  "Pessoa ↔ User" como exemplos.
- **Aceite:** Extensão de exemplo na demo aparece como seção dentro de
  `/configuracoes/instituicao` sem tocar no módulo `tenant`.

---

### U8 — ADR 0015: acesso por registro e dados sensíveis

Decidir agora porque é difícil de encaixar depois, implementar só quando o
Atendimento Social começar.

- Escopo de leitura por registro: `own` (criado por mim / atribuído a mim),
  `role` (visível a um papel), `all`.
- Marcação de **dado sensível** (LGPD art. 11 — saúde, entre outros): leitura
  também é auditada; exportação CSV exige permissão própria.
- Como isso aparece na lista (filtro implícito), no detalhe (403 amigável) e
  na auditoria.
- **Aceite:** ADR revisado por você; nenhuma linha de código.

---

### U9 — Gerador, guia e fechamento

- `new-module.mjs` gera colunas tipadas, campos novos, `metadata` e
  Feature filha (`--feature-of=<pai>`).
- `docs/guia-novo-modulo.md` reescrito a partir da demo.
- Checkpoint completo, merge em `main`, tag **`v1.1.0`**.

---

## 5. Fora desta fase (de propósito)

Chat interno, notificações, construtor de relatórios, dashboard
configurável, busca global (Ctrl+K), regras financeiras, página pública da
instituição, app mobile. Tudo isso fica no `docs/roadmap.md` e só entra
quando um módulo do TerceiroGestor puxar.

## 6. TerceiroGestor enquanto isso

Crie o repositório a partir de `v1.0.0` (U0) e use esse tempo para o que
não depende do visual: conversar com a equipe da ONG, desenhar os models
Prisma de `pessoas`, `vinculos`, `atividades`, `presencas` e
`atendimentos`, e definir quem pode ver o quê (insumo direto da U8). O
primeiro módulo de tela entra depois da `v1.1.0`, trazida por `git merge`.

---

## 7. Como pedir ao Claude Code

Sessão 1 — U0 (correções):

```text
Leia CLAUDE.md, AGENTS.md e docs/PLAN-fundacao-ux.md (seções 1 e 4/U0).
Comece pela U0.0 (ADR 0014) e me mostre antes de gravar. Depois, U0.1 a
U0.5, uma por vez em plan mode curto. Para cada defeito D1–D12, escreva
primeiro o teste que reproduz (vitest, test-db ou smoke) e confirme que
falha pelo motivo descrito; depois corrija. Um commit por item. Ao final,
checkpoint completo e relatório curto. Não faça merge nem tag.
```

Sessão 2 — U1 (demo):

```text
Leia docs/PLAN-fundacao-ux.md (seções 2, 3 e U1) e docs/ui/detail-page.md
com a referência docs/ui/reference/detail-layout.png. Implemente a U1 em
plan mode: createJsonDataHandlers no core e os três contratos da demo em
modules/develop/demo, com dados realistas em português. Nada de domínio
em core/. Termine com screenshots Playwright 1440 e 375 de lista e detalhe
de cada módulo e uma lista do que ainda diverge da referência.
```

Sessões seguintes — U2 a U9 (uma etapa por sessão):

```text
Leia CLAUDE.md, AGENTS.md e docs/PLAN-fundacao-ux.md (etapa U<N>).
Implemente primeiro na demo (modules/develop/demo), mostre screenshots e
espere meu ok; depois leve para os módulos reais (feedbacks, users,
roles, tenant, audit) e, se houver dado novo, para o backend com teste
test-db de isolamento entre tenants. Respeite o escopo do ADR 0014,
registre no CHANGELOG.md e rode o checkpoint completo. Relatório curto:
o que mudou, como testar, o que ficou de fora.
```
