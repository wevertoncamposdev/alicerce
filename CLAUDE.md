# CLAUDE.md — Alicerce

@AGENTS.md

## Específico do Claude Code

- A base está congelada na v1. Se uma tarefa exigir mudar `backend/src/core/`
  ou `frontend/src/core/`, pare, explique o motivo e espere aprovação.
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
