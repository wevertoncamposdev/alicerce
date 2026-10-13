# CLAUDE.md — Alicerce

> Leia **[AGENTS.md](./AGENTS.md)** inteiro antes de qualquer tarefa. Ele é a fonte
> única de verdade deste repositório — stack, regras duras de arquitetura, taxonomia
> de entidades e roadmap. Vale mais do que qualquer padrão encontrado no código.
> Este arquivo não duplica aquele conteúdo: só adiciona o que é específico de operar
> como Claude Code nesta base.

## Onde está cada coisa

| Arquivo/pasta | Papel |
| --- | --- |
| `AGENTS.md` | Regras de arquitetura (estáveis) + roadmap de 9 fases (alto nível) |
| `PLAN.md` | Backlog **tático** vivo — o que falta agora, em passos pequenos e priorizados. Atualize-o ao fechar ou abrir itens; é a fonte de "o que fazer a seguir". |
| `docs/adr/` | Decisões arquiteturais já tomadas (ADRs), com contexto e consequências |
| `docs/features/Completo/` | Documentação de peças de arquitetura já fechadas (TypeView, DataProvider, RelationShell, etc.) |
| `frontend/src/modules/develop/` | Site de documentação interno (rota `/develop`): guia de "como criar um módulo novo" + taxonomia de entidades + armadilhas conhecidas. Bom ponto de partida, mas ver ressalva abaixo. |

## Documentos que podem estar desatualizados — não confiar sem reconferir no código

`backend/issues.md`, a seção de testes do `frontend/README.md`, o
`frontend/src/modules/roles/README.md` e o "Estado atual" do
`frontend/src/modules/develop/*` estavam todos desatualizados — corrigidos/aposentados
no P3 do `PLAN.md` (2026-10-13). Ainda vale desconfiar de:

- `plan/*.md` (gitignored) datados de antes de 2026-07-15 — anteriores ao rewrite do
  frontend para `frontend/src/**` (commit `b28989d`); os arquivos mais novos em
  `plan/` (posteriores a essa data) ainda são relevantes.

Se outro documento contradiz o código, o código manda — corrija ou aposente o
documento como parte da tarefa, e adicione aqui se for um padrão recorrente.

## Método de trabalho nesta base

- O usuário está aprendendo arquitetura/padrões enquanto constrói o template —
  explique o porquê de cada decisão (conceito, tecnologia envolvida, trade-off), não
  só entregue o código (reforço do `AGENTS.md` §7.1.3).
- Trabalhe em passos pequenos e commitáveis individualmente; depois de cada passo,
  rode o checkpoint do `AGENTS.md` §7.1.5 (`tsc --noEmit` + lint + test nos dois
  projetos) antes de seguir.
- Commits em Conventional Commits, escopo pelo módulo (`fix(user): ...`,
  `feat(billing): ...`).
- **Pare e discuta em prosa antes de editar código** sempre que uma tarefa revelar uma
  decisão de arquitetura de grande raio — muda o significado de um modelo de dados,
  afeta algo fora do módulo em edição, ou existem várias opções razoáveis e escolher
  uma fecha as outras. Esse padrão já causou retrabalho nesta base uma vez (ver
  decisão de unicidade de `User.email`, `docs/adr/0002`) — vale a pena confirmar antes
  de editar, não durante.
