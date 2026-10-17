@AGENTS.md

# Frontend — Alicerce

- Rotas em `src/app/` são finas: só chamam screens do core ou do módulo.
- Módulos em `src/modules/<nome>/` seguem o exemplo canônico `feedback`.
- Dados via `createRestDataHandlers(resource)`; não criar fetch manual.
- Módulo novo se registra em `src/bootstrap.ts` e `src/alicerce.config.ts`.
- `src/core/` nunca importa de `src/modules/` nem de `src/platform/` (o lint verifica).
- `src/components/ui/` é shadcn: não editar à mão sem motivo explícito.
- Não criar primitiva de UI nova: usar as que já existem no core.
