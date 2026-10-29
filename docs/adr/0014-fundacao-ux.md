# ADR 0014 — Fundação de UX

- Status: aceito
- Data: 2026-10-28
- Escopo: autoriza, fase a fase, exatamente as pastas/arquivos de `core/`
  listados abaixo para cada etapa de `docs/PLAN-fundacao-ux.md` (seção 4).
  Fora dessas listas, ou para tocar `core/` além do escopo autorizado numa
  etapa, parar e perguntar antes de editar.
  - **U0** (correções D1–D12): `backend/src/core/common/validators/
    is-document.validator.ts`; `backend/src/core/common/transformers/`
    (novo — `OnlyDigits`, `Uf`, `TrimToNull`); `backend/src/core/common/
    validation-error.util.ts` (novo — erro de validação por campo, D5);
    `backend/src/core/storage/**` e `backend/src/core/files/**` (endpoint
    `GET /files/:id/content`); `backend/src/configure-app.ts` (erro
    estruturado do `ValidationPipe` — **correção**: não é `main.ts`, a
    config foi extraída pra `configure-app.ts` na Fase 12/ADR 0013);
    `frontend/src/proxy.ts` (CSP/`img-src`, `matcher`); `frontend/
    next.config.ts` (`serverActions.bodySizeLimit`); `frontend/src/core/
    components/Layout/AppSidebar.tsx`; `frontend/src/core/registry/
    form-validation.ts` (schema parcial do autosave, D2 — já estava
    listado só pra U4, a U0 também precisa); `frontend/src/core/registry/
    actions.ts` e `frontend/src/core/registry/action-errors.ts` (novo —
    extraído de `actions.ts` porque todo export de um módulo `"use server"`
    precisa ser Server Action; função pura não pode ficar lá); e, fora de
    `core/` mas tratado com o mesmo cuidado desde
    o ADR 0005 (é o motor de autosave), `frontend/src/components/TypeView/
    FormView/FormView.tsx` e `frontend/src/hooks/use-autosave-controller.ts`;
    `backend/src/core/auth/me.service.ts` (D6 — `avatarUrl` same-origin);
    e `frontend/src/app/api/proxy/[...path]/route.ts` (D6 — único Route
    Handler genérico permitido pelo `AGENTS.md` §4.1.1, motor de toda
    chamada do browser, mesmo tratamento do FormView/autosave).
    Lista ampliada nas sessões da U0.2 (D2/D4/D5) e U0.4 (D6) — os itens
    novos vieram de investigação durante a implementação, não do desenho
    original.
  - **U1** (demo JSON): `frontend/src/core/data-provider/` (novo
    `json.ts`). Nomes de domínio só em `modules/develop/demo/`.
  - **U2** (linguagem): `frontend/src/core/registry/` (novo `labels.ts`,
    novo `enum.ts`); `frontend/src/core/components/DetailView/` — só o
    novo `EnumBadge.tsx`, ao lado do `statusBadgeClasses.ts` que já
    existe lá (nenhum outro arquivo do DetailView, que fica reservado
    pra U4).
  - **U3** (TypeView v2): `frontend/src/core/table-features.ts`,
    `frontend/src/core/components/Layout/` (lista/colunas),
    `frontend/src/core/registry/types.ts` (tipos de coluna).
  - **U4** (DetailView v2): `frontend/src/core/components/DetailView/**`
    (exceto `RelationView/` e `MetaDataView/`, cobertos nas etapas
    seguintes), `frontend/src/core/registry/types.ts` (tipos de campo),
    `frontend/src/core/registry/form-validation.ts`.
  - **U5** (relações e navegação): `frontend/src/core/components/
    DetailView/RelationView/**`, `frontend/src/core/components/Layout/
    Breadcrumbs.tsx`.
  - **U6** (metadados — Notas/Tags/Histórico): `frontend/src/core/
    components/DetailView/MetaDataView/**`; backend: novo recurso
    polimórfico tenant-scoped no mesmo padrão de `core/files` e do
    `audit.interceptor.ts` — pasta exata (`core/notes`, `core/tags` ou
    `core/metadata`) decidida e registrada aqui quando a sessão da U6
    começar, antes de criar o model.
  - **U7** (Tenant/User mínimos + Extensão 1:1): `scripts/new-module.mjs`
    (gerador; fora de `core/` mas parte da promessa de "zero código novo"
    do `AGENTS.md` §1); `frontend/src/core/registry/types.ts` só se a
    Extensão exigir um tipo de contrato novo.
  - **U8** (ADR 0015) e **U9** (gerador/guia): não tocam `core/` — tabela
    da seção 4 do plano confirma `Não`.
  - Nada além destas listas em `core/` sem perguntar; etapa que, ao ser
    executada, precisar de um arquivo de `core/` fora da lista acima para
    aquela etapa, para e pergunta antes de editar (mesma regra do ADR
    0013).

## Contexto

`docs/PLAN-fundacao-ux.md` nasce de uma revisão de 2026-10-28 (`develop` em
`b5fe765`) pedida pelo Weverton, olhando a base pelos módulos que o
TerceiroGestor vai precisar (Pessoas, Atendimento Social, Atividades,
Grupos, Parceiros, Financeiro, Transparência, Relatórios). A revisão
confirmou 12 defeitos reproduzíveis contra o app rodando (D1–D12, detalhe
na seção 1 do plano) e uma distância de layout em relação a
`docs/ui/reference/detail-layout.png`. Fechar isso agora — mecanismo, não
domínio — evita que cada módulo futuro do produto precise ser refeito.

A base está congelada desde o ADR 0006/`AGENTS.md` §2: mudar `core/` exige
bug real, pedido de módulo real, ou — para decisão difícil de desfazer —
um ADR. As correções D2–D9 e as etapas U1–U7 tocam `core/` (motor de
formulário, storage, CSP, registry, DetailView, data-provider) e a seção 2
do plano toma decisões de modelo de dados central (tenant, usuário,
metadados polimórficos) difíceis de desfazer depois que módulos do produto
dependerem delas. Isso soma os dois critérios do `AGENTS.md` §2 para exigir
ADR, no mesmo papel que o ADR 0013 teve para a Fase 12.

## Decisão

### 1. Tenant mínimo no Alicerce; dado de ONG vira Extensão 1:1 no produto

O tenant é lido em toda requisição (RLS, cache de permissão) e é
compartilhado por qualquer produto construído sobre o Alicerce. Inchar o
model com campos de ONG (registros CMAS/CEBAS, CNAE, missão, diretoria)
obrigaria outros produtos a carregar colunas que nunca usam e tornaria
todo merge do upstream um conflito. Fica: `Tenant` com razão social, nome
fantasia, documento, contato, endereço, logo; o TerceiroGestor cria
`perfil-institucional` como Extensão 1:1 (taxonomia já existe no `AGENTS.md`
§4.3; a U7 formaliza o gerador pra isso).

**Alternativa rejeitada:** adicionar os campos de ONG direto no model
`Tenant`. Resolveria o TerceiroGestor mais rápido, mas quebra o "tenant
mínimo e universal" e vaza domínio pra dentro de `core/`. Rejeitada.

### 2. `User` é acesso; `Pessoa` é identidade

Mesmo raciocínio da decisão 1. `User` fica mínimo (nome, e-mail, avatar,
telefone, status, idioma, tema — acesso e sessão). O TerceiroGestor cria
`Pessoa` com `userId` opcional 1:1: uma Pessoa pode existir sem login (ex.:
atendido), e todo usuário da equipe aponta pra sua Pessoa. Funcionários,
voluntários, diretoria e atendidos não são módulos — são vínculos da
Pessoa, evitando cadastrar a mesma pessoa várias vezes.

### 3. Notas, tags e anexos são recursos polimórficos genéricos, ativados por módulo

Mesmo padrão já usado por `Audit` e `File`: ligados por `entity` +
`entityId`, sem tabela por módulo. Cada módulo ativa no contrato
(`metadata: { notes, tags, attachments }`), sem permissão nova no catálogo
— quem lê/altera o registro lê/altera notas e tags dele. Trocar esse
padrão depois (ex.: virar coluna por módulo) exigiria migrar dado de todo
módulo que já tiver adotado; por isso decide-se agora.

**Alternativa rejeitada:** cada módulo com suas próprias tabelas de nota/
tag. Mais fácil de tipar, mas reimplementa o mesmo mecanismo em cada módulo
de domínio do produto, violando o "zero código de auth/tenant novo"
prometido pelo `AGENTS.md` §1 (aqui extendido a "zero mecanismo de UX
novo"). Rejeitada.

### 4. Timeline é contrato genérico; conteúdo é do produto

`core/` define o contrato (módulos contribuem eventos para um registro
alvo); o TerceiroGestor alimenta com atendimentos, presenças e vínculos.
Nenhum nome de domínio entra em `core/`.

### 5. Acesso por registro e dado sensível ficam para o ADR 0015 (U8)

Decisão de segurança difícil de desfazer, mas que depende do caso real do
Atendimento Social (prontuário) pra não ser abstrata. Adiada
deliberadamente para a U8, depois de U1–U7; não decidida aqui.

## Consequências

- Reabre `core/` (frontend e backend) para as etapas U0–U7 desta fase,
  nos limites exatos do Escopo acima — excepção ao congelamento do
  `AGENTS.md` §2, no mesmo papel que o ADR 0006 e o ADR 0013 já tiveram.
- `CLAUDE.md` passa a citar este ADR como autorização de `core/` para a
  fase.
- Cada item U0.1–U0.5 ganha uma linha no `CHANGELOG.md` (regra geral do
  `AGENTS.md` §2) além do commit próprio.
- U8 (ADR 0015) e U9 não reabrem `core/` além do que este ADR já cobre —
  U9 só atualiza gerador/guia fora de `core/`.
- Tag `v1.0.0` só acontece depois do aceite da U0 e por decisão manual sua
  (`PLAN.md` → Próximo); esta sessão não faz merge nem tag.
