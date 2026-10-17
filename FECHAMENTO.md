# Sessão de FECHAMENTO da v1 do Alicerce

## Leia isto antes de qualquer coisa

Esta é a sessão de FECHAMENTO da base. O objetivo é terminar, não melhorar.
O Alicerce já passou por meses de reestruturações, renomeações e polimento.
A partir de agora, a regra é:

> **Não reconstrua o que já funciona.** Verifique, corrija só lacunas reais,
> feche e marque como pronto.

Antes de editar qualquer arquivo, leia `AGENTS.md` e `CLAUDE.md`. Depois,
apresente o plano completo (use o plan mode) e espere minha aprovação.

### Proibido nesta sessão

- Refatorar, renomear ou reorganizar pastas/arquivos que já funcionam.
- Upgrades de dependências (nenhum `npm update`, nenhum bump de versão).
- Polimento visual, novos tokens, novas primitivas de UI, ajuste de estilo.
- Trabalhar em itens das Fases 5 a 9 do `AGENTS.md` (campos ricos, kanban,
  notifications, files, billing, management, etc.).
- Estender o gerador (`scripts/new-module.mjs`), exceto para corrigir um bug
  que impeça gerar o módulo Feedback.
- Documentar "achados" longos. Relatórios devem ser curtos e objetivos.

Se, durante a sessão, uma correção exigir mudança de grande raio (mudar o
significado de um model, afetar vários módulos, ou houver várias opções
razoáveis), **pare e me pergunte** em vez de decidir sozinho.

### Branch e commits

- Trabalhar na branch `chore/fechamento-v1` a partir do `develop`.
- Um commit por bloco (A, B, C, D), em Conventional Commits.
- Checkpoint (`tsc --noEmit` + lint + test nos dois projetos; `build` no
  frontend) ao final de cada bloco, não a cada micro-passo.

---

## Bloco A — Remover `favorites`/`examples` de uma vez por todas

O módulo de exemplo atual tem nomes diferentes nas duas pontas (`examples`
no backend, `favorites` no frontend). Ele será removido por completo e
substituído pelo Feedback (Bloco B).

Remover tudo, sem deixar vestígio:

- Backend: `src/modules/examples/` (incluindo `features/` e notes), registro
  no `app.module.ts`, entradas no `permission-catalog.ts`, entradas em
  `TENANT_SCOPED_MODELS` (`tenant-rls.extension.ts`), model
  `prisma/models/features/example.prisma` (e o model de notes), seed.
- Migration nova que remove as tabelas e as policies de RLS correspondentes.
  Não apagar migrations antigas.
- Frontend: `src/modules/favorites/`, `src/app/(app)/favorites/`, entrada
  no `alicerce.config.ts`, import no `bootstrap.ts`.
- Testes, docs e o site `/develop` que citem `favorites`, `examples`,
  `FavoriteEntity`, `FavoriteNote` etc.

Critério: `grep -ri "favorite\|examples"` em `backend/src`, `frontend/src`,
`backend/prisma` e `scripts/` não retorna nada (exceto migrations antigas).

---

## Bloco B — Criar o módulo Feedback (novo módulo de exemplo canônico)

O Feedback passa a ser o módulo de referência da base. Ele deve ser
**gerado com o gerador**, para provar que o gerador funciona:
`npm run new:module feedback`.

Depois de gerado, o mínimo de edição manual:

- Campos: `title`, `description`, `status` (enum: RECEIVED, IN_REVIEW,
  PLANNED, DONE, DECLINED; default RECEIVED), autor (`createdById` → User).
- Relação filha `FeedbackComment` (conteúdo, autor, data), exibida no
  DetailView via RelationShell, no mesmo padrão que as notes usavam.
- Permissões:
  - `feedback.create`, `feedback.read`, `feedback.update`, `feedback.delete`
    (geradas);
  - `feedback.manage`, nova, para mudar o `status`. Somente o backend
    decide isso: um usuário sem `feedback.manage` não consegue alterar o
    status nem via API direta.
- Seed: o papel ADMIN recebe todas as permissões de feedback.
- Testes: service spec + um e2e mínimo cobrindo isolamento entre dois
  tenants e a regra de `feedback.manage`.

Registre num arquivo curto `docs/guia-novo-modulo.md` o que o gerador fez
sozinho e o que precisou de edição manual, usando o Feedback como exemplo.
Esse é o manual de uso da base.

Não implementar votos nesta sessão.

---

## Bloco C — Verificar os requisitos da base (verificar, não reescrever)

Para cada requisito abaixo:

1. Verificar no código e nos testes se já está atendido.
2. Se estiver, apenas registrar onde (arquivo + teste).
3. Se houver lacuna pequena, corrigir.
4. Se houver lacuna grande, **parar e me reportar** antes de implementar.

### C1 — Separação por tenant

- Todo model de domínio é tenant-scoped com RLS ativo.
- Acesso cruzado entre tenants retorna 403/404, coberto por e2e.
- Nenhum endpoint aceita `tenantId` vindo do cliente para escopo de dados.

### C2 — Login identifica o tenant automaticamente

- O usuário entra só com e-mail e senha; o tenant vem do próprio usuário
  (e-mail único global, ADR 0002), sem seletor nem header.
- O JWT carrega o `tenantId` e o backend nunca confia em outra fonte.

### C3 — Segurança e auditoria

- Senhas com hash, refresh token com rotação e detecção de reuso,
  cookies httpOnly, rate-limit no login, env validado.
- Toda operação de escrita (create/update/delete) gera auditoria com
  usuário, tenant, entidade, before/after.
- Login, logout, falhas de login e 401/403 são auditados.
- A tela de auditoria lista e filtra esses eventos.

### C4 — Controle de acesso granular

Definição de "pronto" para esta versão:

- O admin do tenant cria papéis (roles) e escolhe, por módulo, quais ações
  cada papel pode fazer (create/read/update/delete + ações especiais como
  `feedback.manage`).
- O admin atribui um ou mais papéis a cada usuário.
- O backend bloqueia toda ação sem permissão (guard), e o frontend esconde
  menus, botões e telas que o usuário não pode acessar.
- O admin não consegue remover o próprio acesso de admin nem deixar o
  tenant sem nenhum admin.

Restrição por registro (ex.: "só vê os próprios feedbacks") **não faz parte
desta versão** — se você achar necessário, me pergunte.

### C5 — Fluxos visuais completos

Cada fluxo deve funcionar ponta a ponta pela interface, sem chamar a API
manualmente:

- Cadastro público: cria o tenant + o usuário admin e já entra logado.
- Login e logout.
- Gestão de usuários: listar, criar (com senha inicial), editar,
  desativar e atribuir papéis.
- Gestão de papéis: listar, criar, editar, excluir e marcar permissões
  por módulo/ação numa tela clara.
- Dados do tenant: o admin edita os dados do próprio tenant.
- Auditoria: listar e filtrar.
- Feedback: listar, criar, abrir o detalhe, comentar e mudar o status
  (só com `feedback.manage`).

Convite por e-mail e "esqueci minha senha" ficam **fora** (dependem de
e-mail, Fase 6).

Como você não consegue clicar no navegador, ao final gere para mim um
**roteiro de teste manual** curto, com os passos para cada fluxo acima,
incluindo um teste com dois tenants e um usuário sem permissão.

---

## Bloco D — Fechamento da documentação e congelamento da base

- Apagar `frontend/src/modules/_template/` se não for usado pelo gerador;
  se for, reescrever o README dele em poucas linhas.
- Mover o `PLAN.md` atual para `docs/historico/PLAN-v0.md` e criar um
  `PLAN.md` novo com no máximo 30 linhas, só com o que vem depois da v1.
- Reescrever o `AGENTS.md` de forma enxuta (mire em até 150 linhas),
  mantendo: intenção, stack, restrições duras de arquitetura (§3),
  contrato de módulo (§5.1) e método de trabalho resumido. O roadmap das
  Fases 5 a 9 vira uma lista "sob demanda", sem ordem e sem caixas.
- Substituir o §9 ("Como começar uma sessão") por esta regra:

  > A base está congelada na v1. O trabalho padrão é criar e evoluir
  > módulos de domínio. A base só muda quando um módulo real precisar de
  > algo que ela não oferece; nesse caso, registrar o motivo num ADR antes
  > de alterar o core. Upgrades de dependência só na janela mensal, em
  > branch própria, nunca no meio de uma feature.

- Atualizar o `CLAUDE.md` para refletir isso e remover referências a
  documentos aposentados.
- Atualizar o `CHANGELOG.md` com a entrada `1.0.0`.

Não crie a tag; ao final, me diga o comando para eu criar a `v1.0.0` depois
do merge.

---

## Critério de pronto da sessão

- Blocos A, B, C e D concluídos, checkpoint verde nos dois projetos.
- Nenhuma referência a `favorites`/`examples` no código.
- Feedback gerado pelo gerador, funcionando como exemplo canônico.
- Os itens C1–C5 marcados como atendidos, com arquivo/teste citado.
- `AGENTS.md` e `PLAN.md` enxutos, base declarada congelada.

## Relatório final (curto)

1. O que mudou, por bloco (uma linha cada).
2. Lacunas encontradas no Bloco C e como foram resolvidas.
3. O que ficou pendente e por quê.
4. Roteiro de teste manual.
5. Comandos para merge e tag.
