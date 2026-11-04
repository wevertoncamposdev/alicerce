import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '@core/prisma/prisma.service';
import { findOneOrThrow } from '@core/common/utils/find-one-or-throw.util';
import { STORAGE_PROVIDER } from '@core/storage/storage-provider.interface';
import type { StorageProvider } from '@core/storage/storage-provider.interface';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import {
  assertEntityAccess,
  checkEntityPermission,
} from '@core/authorization/record-permission.util';

// Whitelist única para todos os usos desta fase (avatar/logo) — Plano
// Base.md fala em "whitelist por uso"; um global simples hoje, revisável
// pra um mapa por `ownerType` se algum uso futuro precisar de outro tipo
// de arquivo (ex.: PDF).
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function maxUploadSizeBytes(): number {
  const raw = process.env.UPLOAD_MAX_SIZE_BYTES;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 1024 * 1024;
}

// D6 (docs/PLAN-fundacao-ux.md): URL same-origin pro preview DENTRO do
// app (autosave do FormView, cabeçalho/sidebar) — passa pelo proxy BFF
// genérico, nunca aponta pro backend/storage direto. Não serve pra
// e-mail (ver `resolve-tenant-branding.util.ts`, que continua usando
// `getSignedUrlOrNull` — um cliente de e-mail não resolve URL relativa
// ao nosso frontend).
export function buildFileContentUrl(fileId: string): string {
  return `/api/proxy/files/${fileId}/content`;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  async upload(params: {
    data: Buffer;
    mime: string;
    ownerType: string;
    tenantId: string;
    uploadedById: string;
  }) {
    const { data, mime, ownerType, tenantId, uploadedById } = params;

    if (!ALLOWED_MIME_TYPES.has(mime)) {
      throw new BadRequestException(`Tipo de arquivo não permitido: ${mime}`);
    }

    if (data.length > maxUploadSizeBytes()) {
      throw new BadRequestException(
        'Arquivo excede o tamanho máximo permitido',
      );
    }

    const extension = EXTENSION_BY_MIME[mime];
    const key = `${crypto.randomUUID()}.${extension}`;

    await this.storage.put(key, data, mime);

    return this.prisma.file.create({
      data: {
        tenantId,
        ownerType,
        mime,
        size: data.length,
        key,
        uploadedById,
      },
    });
  }

  // U6 (docs/PLAN-fundacao-ux.md): aba Anexos do drawer de metadados —
  // lista arquivos de um registro genérico (`ownerType` = nome do recurso
  // de permissão, ex. "feedback"). `denyOnUnknownEntity: false` preserva
  // o comportamento de hoje pra `ownerType` de infra (avatar/logo, sem
  // entrada no catálogo) — só fica mais restrito quando `ownerType` é um
  // recurso real.
  async listForOwner(
    ownerType: string,
    ownerId: string,
    tenantId: string,
    userId: string,
  ) {
    await assertEntityAccess(
      this.permissionCache,
      tenantId,
      userId,
      ownerType,
      'read',
      false,
    );

    return this.prisma.file.findMany({
      where: { tenantId, ownerType, ownerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFileOrThrow(id: string, tenantId: string) {
    return findOneOrThrow(
      await this.prisma.file.findUnique({ where: { id } }),
      (file) => file.tenantId === tenantId && file.deletedAt === null,
      'Arquivo não encontrado',
    );
  }

  async getSignedUrl(id: string, tenantId: string) {
    const file = await this.getFileOrThrow(id, tenantId);
    const url = await this.storage.getSignedUrl(file.key);
    return { url, expiresAt: new Date(Date.now() + 3600 * 1000).toISOString() };
  }

  // D6: usado por `GET /files/:id/content` — tenant-scoping vem de
  // `getFileOrThrow`, igual todo o resto deste service.
  async getContent(id: string, tenantId: string) {
    const file = await this.getFileOrThrow(id, tenantId);
    const content = await this.storage.getContent(file.key);
    return { ...content, mime: file.mime };
  }

  // Resolver avatarUrl/logoUrl pra exibição não deve derrubar a página com
  // 404 se o File referenciado tiver sido removido depois de anexado —
  // só não mostra imagem nesse caso raro.
  async getSignedUrlOrNull(
    id: string,
    tenantId: string,
  ): Promise<string | null> {
    try {
      const { url } = await this.getSignedUrl(id, tenantId);
      return url;
    } catch {
      return null;
    }
  }

  // Usada por quem ANEXA um arquivo a outra entidade (avatar do usuário,
  // logo da instituição) — garante que só quem enviou o arquivo pode
  // reaproveitá-lo dessa forma (ver ADR 0010).
  async assertUploadedBy(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const file = await this.getFileOrThrow(id, tenantId);
    if (file.uploadedById !== userId) {
      throw new BadRequestException(
        'Só é possível usar um arquivo que você mesmo enviou',
      );
    }
  }

  async remove(id: string, tenantId: string, requesterId: string) {
    const file = await this.getFileOrThrow(id, tenantId);

    if (file.uploadedById !== requesterId) {
      // U6: quem pode alterar o registro dono (ex. "feedback.update")
      // também pode remover um anexo que não enviou — além do uploader,
      // mesmo padrão de autor-ou-permissão de `NotesService`.
      const freshPermissions = await this.permissionCache.getFreshPermissions(
        tenantId,
        requesterId,
      );
      const canRemoveViaOwner =
        checkEntityPermission(freshPermissions, file.ownerType, 'update') ===
        'granted';

      if (!canRemoveViaOwner) {
        throw new ForbiddenException(
          'Só quem enviou o arquivo (ou quem pode alterar o registro) pode removê-lo',
        );
      }
    }

    await this.storage.delete(file.key);
    await this.prisma.file.update({
      where: { id: file.id },
      data: { deletedAt: new Date() },
    });
  }

  // Chamado pelo `remove()` de cada módulo que adota `metadata.attachments`
  // — mesmo papel de `NotesService.removeForRecord`/`RecordTagsService.
  // removeForRecord`, mas também limpa o storage (não é só linha de banco).
  async removeAllForOwner(
    ownerType: string,
    ownerId: string,
    tenantId: string,
  ): Promise<void> {
    const files = await this.prisma.file.findMany({
      where: { tenantId, ownerType, ownerId, deletedAt: null },
    });

    for (const file of files) {
      await this.storage.delete(file.key);
    }

    await this.prisma.file.updateMany({
      where: { id: { in: files.map((file) => file.id) } },
      data: { deletedAt: new Date() },
    });
  }
}
