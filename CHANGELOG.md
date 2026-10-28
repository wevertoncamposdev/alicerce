# Changelog

Todas as alterações relevantes deste projeto serão documentadas neste arquivo.

O versionamento segue o padrão Semantic Versioning (SemVer).

---

## [Unreleased]

### Fixed

- Autosave envia só os campos alterados desde o último save, nunca `""`
  em campo vazio (D2, ADR 0014).
- Erro de validação chega estruturado por campo até a tela, mesmo em
  produção (D5, ADR 0014).

---

## [1.0.0] - 2026-10-17

Fechamento da v1: base congelada, pronta para evoluir só por módulos de
domínio novos.

### Added

- Estrutura de instruções reescrita em `AGENTS.md`, `CLAUDE.md` e `PLAN.md`.
- Roadmap de funcionalidades sob demanda em `docs/roadmap.md`.
- Histórico restaurado em `docs/historico/PLAN-v0.md` e `docs/historico/AGENTS-v0.md`.
- Módulo `feedback`, novo módulo canônico de exemplo da base (status,
  comentários via `RelationShell`, permissão `feedback.manage`), gerado com
  `npm run new:module` — ver `docs/guia-novo-modulo.md`.
- Auditoria de login com senha incorreta (`AuditType.LOGIN_FAILED`).
- Proteção contra o tenant ficar sem nenhum administrador: bloqueia remover
  a própria role de admin e bloqueia desativar/remover/excluir o último
  admin do tenant.

### Changed

- Padronização da documentação de setup e referência do projeto para o estado v1.
- Site interno `/develop` passa a citar o módulo `feedback` como referência.

### Fixed

- Ajuste de encoding dos arquivos de histórico para evitar que fiquem como binários no diff.

### Removed

- Templates antigos e documentos obsoletos em `docs/` e `REVISAO.md` movido para histórico.
- Módulo de exemplo antigo `examples`/`favorites` (backend e frontend),
  substituído pelo módulo `feedback`.
- `frontend/src/modules/_template/`, não usado pelo gerador.

---

## [0.1.0] - Em desenvolvimento

### added

- Estrutura inicial do projeto
- Feature favorites

## [0.7.0] - Em desenvolvimento
