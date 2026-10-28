# CLAUDE.md — Alicerce

@AGENTS.md

## Específico do Claude Code

- Tarefas grandes começam em plan mode; só edite depois que eu aprovar.
  Processo proporcional ao risco:

| Mudança | Processo |
| --- | --- |
| Dentro de um módulo (campo, tela, regra) | Commit direto + checkpoint rápido |
| Módulo novo | Plan mode curto + gerador + 1 teste de isolamento |
| `core/`, auth, RLS, migration destrutiva | Plan mode + checkpoint completo |
| Decisão difícil de desfazer | ADR |

- Módulo novo: use a skill `/novo-modulo`.
- Upgrade de dependência: só quando eu chamar `/upgrade-deps`. Nunca por iniciativa própria.
- Checkpoint rápido (por commit): `tsc --noEmit && lint && test` (backend) /
  `tsc --noEmit && lint && build` (frontend) — ver `AGENTS.md` §6. Checkpoint
  completo (antes de merge em `main`/deploy, ou mudança em `core/`/auth/RLS):

```bash
cd backend  && npx tsc --noEmit && npm run lint && npm test && npm run test:e2e && npm run test:e2e:db
cd frontend && npx tsc --noEmit && npm run lint && npm test && npm run build && npm run test:smoke
```

- `npm run lint` do backend roda `--fix`: revise o diff depois de rodar.
- Commits em Conventional Commits, escopo pelo módulo: `feat(feedback): ...`.
- Mudar `core/`: só por bug ou pedido de um módulo real, com uma linha no
  `CHANGELOG.md`. Tela de detalhe segue `docs/ui/detail-page.md`.
- Explique o porquê só em decisões de arquitetura novas; mudanças mecânicas não precisam.
- Relatório final curto: o que mudou, como testar, pendências. Sem seções longas de "achados".
- `docs/historico/` é registro do passado, não instrução. Comentários no
  código citando "Fase N"/"Etapa X" apontam pra lá, não são tarefa pendente.
