# 0002 — `User.email` é único na plataforma inteira, não por tenant

## Status

Aceita — 2026-10-04.

## Contexto

O schema tinha `email String @unique` (unicidade global) **e**
`@@unique([tenantId, email])` (unicidade composta por tenant) ao mesmo tempo —
contraditório, já que o `@unique` global torna o composto redundante e, na prática,
impede que o mesmo e-mail exista em tenants diferentes de qualquer forma. Esse era um
item explícito da Fase 0 do `AGENTS.md`: "decidir unicidade de `User.email` (global ou
por tenant) e alinhar o schema".

A primeira tentativa de resolver isso foi assumir o padrão genérico de SaaS multi-tenant
("o mesmo e-mail pode ter contas independentes em instituições diferentes") e migrar
para unicidade por tenant. Isso expôs um problema real: o login (`AuthService.signIn`)
recebe só `email` + `senha`, sem nenhum identificador de tenant — com e-mail não-único
globalmente, o backend não tem como saber em qual tenant procurar o usuário sem alguma
forma de navegação prévia (subdomínio, slug na URL, etc.), algo que não existe na
aplicação hoje.

Discutindo o modelo de domínio pretendido, ficou claro que esse problema não se aplica
aqui: o Alicerce modela tenant como a identidade de uma instituição e o usuário como uma
pessoa vinculada a exatamente uma instituição — não há caso de uso para a mesma pessoa
ter contas em instituições diferentes com o mesmo e-mail. O cadastro público
(`signUpPublic`) já cria tenant + usuário admin juntos; usuários adicionais são sempre
criados dentro do contexto de um tenant já autenticado (via `@TenantId()`), nunca
escolhendo o próprio tenant.

## Decisão

`User.email` é único em toda a plataforma (`@unique`, sem o composto
`[tenantId, email]`). Login continua recebendo só `email` + `senha`;
`AuthService.getAuthUserByEmail` encontra uma única linha e o `tenantId` dela é o que vai
para o JWT — sem precisar de slug, subdomínio ou qualquer passo extra de identificação de
tenant no login.

O índice composto `users_tenantId_email_key` foi removido (migration
`20261004202724_user_email_global_uniqueness`); o índice único global `users_email_key`
(já existente desde a migration inicial) é o que passa a valer como única fonte de
verdade.

## Consequências

- Uma pessoa não pode ter o mesmo e-mail em duas instituições diferentes — precisaria de
  dois e-mails (duas contas). É a restrição esperada para o domínio do Alicerce.
- O login não precisa de nenhuma mudança de UX/contrato — continua `email` + `senha`.
- `signUpPublic` já checava `existingByEmail` globalmente antes de criar o tenant; isso
  passa a ser a verificação correta e definitiva (antes convivia com uma unicidade por
  tenant que nunca chegou a ser usada de fato).
- Isolamento entre tenants nos dados de cada usuário continua garantido pelo restante do
  trabalho da Fase 0 em `RolesService`, `TenantController` e `TenantMiddleware`: o
  `tenantId` do JWT (derivado aqui no login) é sempre a fonte de verdade para
  autorização, nunca algo escolhido pelo cliente.
