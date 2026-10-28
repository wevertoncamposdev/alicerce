# ADR 0010 — Storage

- Status: aceito
- Data: 2026-10-19
- Escopo: autorizado pelo ADR 0006 (Fase 6 do `Plano Base.md`).
  - Em `core/`: `backend/src/core/storage/**` (novo),
    `backend/src/core/prisma/extensions/tenant-rls.extension.ts` (`File`
    entra em `TENANT_SCOPED_MODELS`), `frontend/src/core/registry/types.ts`
    (`FormFieldConfig` ganha o tipo `"image"` + `previewUrl`/
    `uploadOwnerType`), `frontend/src/core/registry/actions.ts` (nova
    `uploadFileAction` — só adição, `autoSaveRecord`/
    `createRecordFormAction` não mudam).
  - Fora de `core/`: `backend/src/modules/file/**` (novo),
    `backend/prisma/models/main/` (model `File` + FKs em `User`/`Tenant`),
    `frontend/src/components/TypeView/FormView/FormView.tsx` (mesmo
    arquivo já autorizado pela ADR 0005 para outro propósito, agora
    autorizado de novo pela 0010 para o campo `image`),
    `frontend/src/lib/api-server.ts` (novo `apiServer.upload`).
  - Nada além dessa lista em `core/` sem perguntar.

## Contexto

Primeira infraestrutura de storage do template: até aqui não existe
nenhum jeito de guardar um arquivo. A Fase 6 pede isso para dois usos
imediatos (avatar do usuário, logo da instituição) e qualquer anexo
futuro. É infraestrutura cross-cutting — precisa da mesma independência de
provedor que `PrismaService`/`RedisService` já têm para banco e cache.

## Decisão

### Interface única, dois adapters

```ts
interface StorageProvider {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
```

- `LocalDiskStorageProvider` (dev): grava em `STORAGE_LOCAL_PATH`.
- `S3StorageProvider` (produção): `@aws-sdk/client-s3` +
  `@aws-sdk/s3-request-presigner`, `endpoint` configurável — mesmo client
  fala com AWS S3, Cloudflare R2 ou MinIO, sem código condicional por
  provedor. Implementado de verdade nesta fase (não um stub) — sem infra
  real para testar agora, cobertura é só unitária (SDK mockado); fica
  pronto pra produção sem retrabalho.
- `StorageModule` (`@Global()`, mesmo padrão do `RedisModule`) escolhe o
  provider por `STORAGE_DRIVER=local|s3`. Nenhum código fora do adapter
  conhece o provedor ativo — `FilesService` só injeta `StorageProvider`.

**Novas dependências:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
— não há alternativa viável sem SDK para falar o protocolo S3
corretamente (assinatura de request, presigned URLs), e é o cliente padrão
de facto também para R2/MinIO.

### "URL assinada" nos dois drivers, não só em produção

Em vez de servir os arquivos locais por um caminho estático aberto,
`LocalDiskStorageProvider.getSignedUrl` gera um token HMAC-SHA256 (chave +
expiração, reaproveitando `COOKIE_SECRET` — não precisa de segredo novo) e
devolve `GET /storage/local/:key?sig=...&exp=...`; um endpoint
`@Public()` dedicado verifica a assinatura/expiração antes de streamar o
arquivo do disco. Mantém "download por URL assinada" verdadeiro nos dois
drivers, sem endpoint de arquivo totalmente aberto em dev.

### Autorização de posse no momento de anexar, não no upload

`POST /files` só exige autenticação (sem `@Permissions` — é
infraestrutura genérica, não um recurso de domínio com permissão própria)
e grava `tenantId`/`uploadedById` do JWT; `ownerType`/`ownerId` são
metadados opcionais e não-autoritativos no momento do upload — um arquivo
pode existir "órfão" até ser efetivamente anexado a algo.

A checagem real acontece quando o arquivo é anexado (ex.: `PATCH /me` com
`avatarFileId`, `PATCH /tenant/current` com `logoFileId`): o service busca
o `File` (já tenant-scoped via RLS) e rejeita com 400 se `uploadedById`
não for o usuário autenticado atual. Isso evita que alguém aponte seu
avatar para um arquivo que outro usuário do mesmo tenant enviou, sem
precisar que `POST /files` já saiba de antemão pra que vai servir cada
upload.

## Consequências

- `File` entra em `TENANT_SCOPED_MODELS` — isolamento entre tenants vem de
  graça via RLS, mesmo mecanismo de todo o resto do schema.
- Resolver `avatarUrl`/`logoUrl` é sempre feito em request-time
  (`FilesService.getSignedUrl`), nunca persistido — a URL assinada expira
  e rotaciona; só o `avatarFileId`/`logoFileId` (estável) fica no banco.
- `FormFieldConfig.type: "image"` só funciona em `mode="edit"` nesta fase
  — todo uso real (avatar, logo) edita um registro que já existe;
  `CreateFormView` não precisa suportar o tipo ainda.
- Upload sem destino nunca é limpo automaticamente nesta fase (sem job de
  GC de arquivos órfãos) — aceitável para o "mínimo" da Fase 6, revisável
  se o volume de uploads abandonados importar depois.

## Nota (etapa 12.3, ADR 0013)

`FormFieldConfig.previewUrl` (decisão original acima: função `(record) =>
string`) virou `previewField` (nome do campo do registro, não função) —
função não serializa na fronteira Server→Client e derrubava `/perfil` e
`/configuracoes/instituicao` em produção (C2, corrigido na etapa 12.3). A
decisão de onde a URL é resolvida (request-time, no backend) não muda —
só a forma como o contrato aponta pra ela.
