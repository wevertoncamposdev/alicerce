# 0001 — Estratégia de branches: `develop` e `main`

## Status

Aceita — 2026-10-04.

## Contexto

O repositório tinha três branches de longa duração no remoto: `master` (parado no commit
`init`, já removido do GitHub antes desta decisão), `main` e `develop`. Nos últimos commits
antes desta decisão, o trabalho passou a ser feito direto em `main` — incluindo merges de
`develop` para dentro de `main` — o que deixou `develop` 10 commits atrás. Isso inverte o
papel que as duas branches deveriam ter: produção (`main`) não deveria nunca estar na frente
da integração (`develop`).

## Decisão

A partir de agora, o repositório usa duas branches de longa duração com papéis fixos:

- **`main`** — produção. Só recebe merge vindo de `develop`, via PR, e só quando o checkpoint
  da seção 7.1 do `AGENTS.md` (`tsc --noEmit && lint && test` nos dois projetos) passa.
  Nenhum commit direto em `main`.
- **`develop`** — integração. Todo o trabalho de qualquer fase do roadmap (seção 8 do
  `AGENTS.md`) acontece aqui, direto ou via branch de escopo (`feat/<escopo>`,
  `fix/<escopo>`, `chore/<escopo>`) criada a partir de `develop` e mesclada de volta nela.

Promover `develop` → `main` é um ato deliberado (equivalente a um release), nunca incidental.

Como realinhamento inicial, `develop` foi atualizada por fast-forward até o ponto em que
`main` estava (`87ead7d`), já que `develop` era um ancestral direto — sem conflito.

## Consequências

- Histórico de `main` fica sempre coerente com o que já passou pelo checkpoint da seção 7.1.
- O CI (`.github/workflows/ci.yml`), que já roda em push/PR para `develop` e `main`, passa a
  ser o gate antes de qualquer merge para `main` — recomenda-se ativar branch protection em
  `main` no GitHub (exigir PR + CI verde, proibir push direto); isso não pôde ser feito via
  git CLI nesta sessão e fica como ação manual do usuário.
- Branches de escopo antigas no remoto (`feat/favorites`,
  `feature/define_the_feature_structure`, `feature/frontend_tools`, `fix/multiple-request`,
  `refactor/authentication-flow`, `security/favorites-tenant-filter`, `study/architecture`)
  não foram tocadas por esta decisão; ficam para uma limpeza futura, se já estiverem
  mescladas.
