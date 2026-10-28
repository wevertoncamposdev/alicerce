# ADR 0011 — Mail Provider

- Status: aceito
- Data: 2026-10-19
- Escopo: autorizado pelo ADR 0006 (Fase 7 do `Plano Base.md`).
  - Em `core/`: `backend/src/core/mail/**` (novo),
    `backend/src/core/auth/account-token.service.ts` (novo, etapa 7.2),
    `backend/src/core/auth/session-revocation.util.ts` (novo, etapa 7.3 —
    extrai a lógica já duplicada em `UsersService.revokeAllSessions` e
    `MeService.revokeSessions`, sem mudar comportamento),
    `backend/src/core/prisma/extensions/tenant-rls.extension.ts`
    (`AccountToken` entra em `TENANT_SCOPED_MODELS`),
    `backend/src/core/auth/auth.service.ts` (`signIn`/`signUpPublic`
    passam a lidar com senha nula e a emitir e-mail de verificação),
    `backend/src/core/config/env.schema.ts` (variáveis novas).
  - Fora de `core/`: `backend/prisma/models/main/` (model `AccountToken` +
    `User.invitedAt`/`emailVerifiedAt`/`password` nullable),
    `backend/src/modules/user/**` (convite), `frontend/src/app/(public)/
    auth/**` (páginas novas), `frontend/src/modules/perfil/**` (seção de
    troca de e-mail), `frontend/src/modules/users/**` (remove o campo de
    senha da criação, mostra convite pendente).
  - Nada além dessa lista em `core/` sem perguntar.

## Contexto

Até a Fase 6, nenhum fluxo do Alicerce depende de e-mail de verdade. A
Fase 7 introduz quatro fluxos que precisam mandar e-mail (redefinir senha,
convidar usuário, verificar e-mail no cadastro, trocar e-mail) — todos
precisam da mesma coisa: uma forma de enviar e-mail independente de
provedor, e um token de uso único para provar posse de uma caixa de
entrada. Esta ADR cobre a primeira peça (`MailProvider`); o token de uso
único (`AccountToken`) é consequência direta da mesma decisão e está
documentado aqui porque os dois nascem juntos nesta fase.

## Decisão

### Interface única, três adapters

```ts
interface MailProvider {
  send(message: { to: string; subject: string; html: string; text: string }): Promise<void>;
}
```

- `ConsoleMailProvider` (dev, default): loga o e-mail completo via
  `Logger`, não envia de verdade — é o que torna "e-mail de teste aparece
  no console" verdadeiro sem precisar de credencial nenhuma.
- `SmtpMailProvider`: `nodemailer` (dependência nova — não existe cliente
  SMTP sem uma lib; é o padrão de facto do ecossistema Node).
- `ResendMailProvider`: `fetch` direto contra a API REST do Resend
  (`POST https://api.resend.com/emails`, Bearer token) — sem SDK, a API é
  simples o suficiente pra não justificar mais uma dependência.
- `MailModule` (`@Global()`, mesmo padrão do `StorageModule`/ADR 0010):
  escolhe o adapter por `MAIL_DRIVER=console|smtp|resend` (default
  `console`). Nenhum código fora do adapter conhece o provedor ativo.
- `MailService` (o que o resto do app injeta, nunca o `MailProvider` cru —
  mesmo papel que `FilesService` tem sobre `StorageProvider`): `send(...)`
  com retry (3 tentativas, backoff curto). Se todas as tentativas
  falharem, loga o erro e resolve — e-mail nunca derruba o fluxo
  principal que o disparou (login, convite, troca de senha...). Fila em
  Redis para retry assíncrono de verdade é melhoria futura, citada no
  próprio Plano Base.

### Token de uso único (`AccountToken`)

Um model e um service genéricos para os quatro fluxos (`INVITE`,
`RESET_PASSWORD`, `VERIFY_EMAIL`, `CHANGE_EMAIL`), em vez de uma tabela e
uma validação por fluxo:

- `tokenHash` guardado com o mesmo padrão de `RefreshToken.token` (sha256
  do valor cru — nunca persiste o token em claro).
- `consume(rawToken, type)` é a única porta de saída: confere expiração e
  `usedAt`, marca usado, e nunca diferencia no erro "não existe" de
  "expirado" de "já usado" — evita dar pista sobre qual dos três aconteceu.
- `CHANGE_EMAIL` guarda o e-mail novo no próprio token (`newEmail`) — não
  precisa de uma tabela separada só para isso.

### Consolidação mecânica a caminho

`UsersService.revokeAllSessions` e `MeService.revokeSessions` já duplicam
a mesma lógica de revogar sessões de um usuário. O fluxo de reset de senha
(etapa 7.3) precisa da mesma coisa de novo — em vez de uma TERCEIRA cópia,
extraio `core/auth/session-revocation.util.ts` e troco as duas chamadas
existentes para usá-lo. Mecânico, sem mudar comportamento observável.

## Consequências

- `MAIL_DRIVER=console` como default significa que todo ambiente de
  desenvolvimento funciona sem nenhuma credencial de e-mail configurada —
  consistente com `STORAGE_DRIVER=local` da Fase 6.
- Nenhum fluxo de conta (convite, reset, verificação, troca de e-mail)
  falha porque o envio de e-mail falhou — na pior hipótese, o usuário não
  recebe o e-mail e precisa pedir de novo (reenviar convite já é um
  endpoint da etapa 7.4; os outros fluxos podem ser disparados de novo
  pelo próprio usuário).
- `AccountToken` fica tenant-scoped via RLS como todo o resto do schema —
  isolamento entre tenants vem de graça, mesmo mecanismo de sempre.
