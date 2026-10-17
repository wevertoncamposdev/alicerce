# Backend — Alicerce

- Todo model de domínio é tenant-scoped: campo `tenantId`, entrada em
  `TENANT_SCOPED_MODELS` (`tenant-rls.extension.ts`) e migration de RLS.
  O gerador já faz isso; não remover.
- Nunca aceitar `tenantId` vindo do cliente. O tenant vem do JWT.
- Services seguem o contrato: `findOneOrThrow`, `resolvePagination`,
  `tenant-search.util.ts` (whitelist de sort/filtros).
- Permissões novas entram em `src/core/authorization/permission-catalog.ts`.
- Usar exceções HTTP do Nest (`NotFoundException` etc.), nunca `Error`.
- Valores monetários em centavos (`Int`), nunca `Float`.
- Jest roda com `--experimental-vm-modules` (NestJS 12 é ESM); não mexer
  na configuração de testes sem motivo.
