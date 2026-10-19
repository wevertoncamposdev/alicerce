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

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
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

  async remove(id: string, tenantId: string, requesterId: string) {
    const file = await this.getFileOrThrow(id, tenantId);

    if (file.uploadedById !== requesterId) {
      throw new ForbiddenException('Só quem enviou o arquivo pode removê-lo');
    }

    await this.storage.delete(file.key);
    await this.prisma.file.update({
      where: { id: file.id },
      data: { deletedAt: new Date() },
    });
  }
}
