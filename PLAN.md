# PLAN.md — Trabalho atual

> Só o que está em andamento. O histórico até a v1 está em
> `docs/historico/PLAN-v0.md`.

## Agora

- [x] Sessão de fechamento da v1 (blocos A a D) — concluída em 2026-10-17.
      Base congelada; `feedback` é o módulo canônico de exemplo.
- [x] Detail Page v2 (ADR 0005) — concluída em 2026-10-18. Breadcrumb/ações no
      topbar, autosave sempre ativo, relações como links, "Novo" abre o
      Detail (`feedback`, único módulo migrado); gerador já cria módulos
      novos nesse formato.
- [ ] Primeiro módulo de domínio com `/novo-modulo`

## Pendências conhecidas (não bloqueiam)

- Validação manual em navegador: login → expirar token → navegar
- `--feature-of <pai>` no gerador (sob demanda)
