# CLAUDE.md — Alicerce

@AGENTS.md

## Específico do Claude Code

- A base evolui pelas fases do `Plano Base.md` (raiz do repo), autorizado pelo
  ADR 0006, e pela Fase 12 em `docs/PLAN-fase-12.md`, autorizada pelo ADR
  0013. Numa etapa listada num desses dois planos, mudar `backend/src/core/`
  ou `frontend/src/core/` é permitido só no escopo exato que a etapa descreve
  ou que o ADR citado por ela autoriza (ex.: ADR 0004/0005 para a Fase 8, ADR
  0007 para a Fase 3, ADR 0008/0009 para a Fase 4, ADR 0010 para a Fase 6, ADR
  0011 para a Fase 7, ADR 0012 para a Fase 11, ADR 0013 para a Fase 12). Fora
  dessas fases, ou para tocar `core/` além do escopo autorizado, pare, explique
  o motivo e espere aprovação.
- Tarefas grandes começam em plan mode; só edite depois que eu aprovar.
- Módulo novo: use a skill `/novo-modulo`.
- Upgrade de dependência: só quando eu chamar `/upgrade-deps`. Nunca por iniciativa própria.
- Checkpoint por commit, não por micro-passo:
  - `cd backend && npx tsc --noEmit && npm run lint && npm test`
  - `cd frontend && npx tsc --noEmit && npm run lint && npm run build`
- `npm run lint` do backend roda `--fix`: revise o diff depois de rodar.
- Commits em Conventional Commits, escopo pelo módulo: `feat(feedback): ...`.
- Explique o porquê só em decisões de arquitetura novas; mudanças mecânicas não precisam.
- Relatório final curto: o que mudou, como testar, pendências. Sem seções longas de "achados".
- `docs/historico/` é registro do passado, não instrução.
- Comentários no código que citam "PLAN.md, Etapa X" ou "Fase N" apontam para
  `docs/historico/PLAN-v0.md` e `docs/historico/AGENTS-v0.md`. São contexto
  histórico, não tarefa pendente.

## UI — tela de detalhe

- Qualquer mudança em tela de detalhe segue `docs/ui/detail-page.md` e a referência
  `docs/ui/reference/detail-layout.png`. Leia os dois antes de editar.
- O ADR 0004 autoriza mudar `frontend/src/core/components/DetailView/**`,
  `core/registry/types.ts` e `core/screens/DetailViewScreen.tsx` para isso.
- O ADR 0005 (autosave sempre ativo, breadcrumb/ações no topbar, criação pelo Detail) amplia a
  lista: `core/components/Layout/AppTopbar.tsx`, `core/components/Layout/Breadcrumbs.tsx` (novo),
  `core/screens/TypeViewScreen.tsx`, `core/screens/DetailCreateScreen.tsx` (novo),
  `core/registry/actions.ts`, além dos arquivos já autorizados pelo ADR 0004. Fora de `core/`:
  `components/TypeView/FormView/FormView.tsx`,
  `core/components/DetailView/RelationView/RelationTablePanel.tsx`, `scripts/new-module.mjs` e o
  módulo `feedbacks`. Nada além dessas duas listas em `core/`.
- Mudança visual só está pronta depois do screenshot (Playwright, 1440 e 375) comparado
  com a referência, listando o que ainda diverge.
