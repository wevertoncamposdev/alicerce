# PLAN.md — Trabalho atual

> Só o que está em andamento. O roteiro completo das fases v1 → v1.1/v2 está
> em `Plano Base.md`. O histórico até a v1 está em `docs/historico/PLAN-v0.md`.

## Agora

- [x] Fases 0–10 do `Plano Base.md` concluídas em 2026-10-24 (etapas 9.2,
      9.3 e 10.1–10.6 na mesma sessão que fechou a Fase 9 — ver histórico
      de commits `feat(lgpd)`/`feat(ops)`/`docs(ops)`).
- [ ] Fase 11 (v2) — sob demanda, puxada pelo TerceiroGestor. Sem data.

## Pendências conhecidas (não bloqueiam)

- 10.2 (monitoramento): adapter Sentry implementado e gated por env, mas
  nunca confirmado contra um painel Sentry real (exige conta/projeto).
- 10.3 (CSP): headers corretos confirmados via `curl` num build de
  produção local; falta um teste manual num browser real (sem
  `chromium-cli`/Playwright utilizáveis no ambiente onde foi implementado).
- 10.5/10.6 (deploy, backup/restore): documentação e scripts prontos, mas
  nunca executados de ponta a ponta (sem `docker`/`pg_dump` disponíveis
  onde foram escritos) — primeira execução real fica pra quem tiver acesso
  a um ambiente de staging.
