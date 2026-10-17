---
name: upgrade-deps
description: Janela mensal de atualização de dependências do Alicerce.
disable-model-invocation: true
---

## Regras

- Branch própria: `chore/upgrade-<pacote>-<versão>`, a partir do `develop`.
- Um upgrade major por branch. Patches e minors podem ir juntos.
- Node: sempre o LTS ativo em `.nvmrc`, `engines` e no CI.
- Antes de qualquer upgrade, consultar a versão estável atual
  (`npm view <pacote> version`) e as notas de release oficiais.
  Não confiar em versões lembradas.

## Passos

1. Rode `npm outdated` e `npm audit` nos dois projetos e me mostre a lista
   antes de alterar qualquer coisa.
2. Leia o changelog e os breaking changes e anote o que se aplica ao Alicerce.
3. Rode os codemods oficiais quando existirem.
4. `npm ci` limpo → checkpoint completo → `npm audit`.
5. Suba o Docker e teste: login, CRUD do módulo `feedback`, refresh de sessão.
6. Registre no `CHANGELOG.md` e, se mudou alguma decisão, num ADR.
7. Se um upgrade quebrar algo que exija mudança de código fora de config,
   pare e me reporte em vez de adaptar o código.

## Roteiro por pacote

| Pacote | Como atualizar | O que verificar |
| --- | --- | --- |
| Next.js + React | `npx @next/codemod@latest upgrade latest` no `frontend/` | `proxy.ts`, APIs assíncronas (`cookies`, `headers`, `params`), cache, `eslint-config-next` na mesma versão |
| Prisma | `prisma`, `@prisma/client` e `@prisma/adapter-pg` juntos, na mesma versão; `npx prisma generate` | generator `prisma-client` + `moduleFormat`, `prisma.config.ts`, migrations aplicando do zero em banco limpo |
| NestJS | todos os `@nestjs/*` na mesma major; `@fastify/*` compatíveis com o `fastify` do adapter | bootstrap, plugins Fastify, Swagger, Jest com ESM, testes e2e |
| TypeScript | nos dois projetos ao mesmo tempo | `tsc --noEmit` limpo nos dois; teto de versão do `typescript-eslint` |
| Tailwind + shadcn | `npx shadcn@latest diff` | componentes de `components/ui` sem edições locais perdidas |
| ESLint / Prettier / Jest | em grupo | lint e testes sem regressão |