import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { assertEntityAccess } from '@core/authorization/record-permission.util';
import { findOneOrThrow } from '@core/common/utils/find-one-or-throw.util';
import { TagsService } from './tags.service';
import { AttachTagDto } from './dto/attach-tag.dto';

@Injectable()
export class RecordTagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionCache: PermissionCacheService,
    private readonly tagsService: TagsService,
  ) {}

  async findAll(
    entity: string,
    entityId: string,
    tenantId: string,
    userId: string,
  ) {
    await assertEntityAccess(
      this.permissionCache,
      tenantId,
      userId,
      entity,
      'read',
    );

    return this.prisma.recordTag.findMany({
      where: { entity, entityId, tenantId },
      include: { tag: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async attach(dto: AttachTagDto, tenantId: string, userId: string) {
    await assertEntityAccess(
      this.permissionCache,
      tenantId,
      userId,
      dto.entity,
      'update',
    );

    const tagId = await this.resolveTagId(dto, tenantId);

    const existing = await this.prisma.recordTag.findUnique({
      where: {
        tagId_entity_entityId: {
          tagId,
          entity: dto.entity,
          entityId: dto.entityId,
        },
      },
      include: { tag: true },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.recordTag.create({
      data: { tenantId, tagId, entity: dto.entity, entityId: dto.entityId },
      include: { tag: true },
    });
  }

  async detach(id: string, tenantId: string, userId: string) {
    const recordTag = findOneOrThrow(
      await this.prisma.recordTag.findUnique({ where: { id } }),
      (entry) => entry.tenantId === tenantId,
      'Tag do registro não encontrada',
    );

    await assertEntityAccess(
      this.permissionCache,
      tenantId,
      userId,
      recordTag.entity,
      'update',
    );

    await this.prisma.recordTag.delete({ where: { id: recordTag.id } });
  }

  // Chamado pelo `remove()` de cada módulo que adota `metadata.tags`.
  async removeForRecord(entity: string, entityId: string, tenantId: string) {
    await this.prisma.recordTag.deleteMany({
      where: { entity, entityId, tenantId },
    });
  }

  private async resolveTagId(
    dto: AttachTagDto,
    tenantId: string,
  ): Promise<string> {
    if (dto.tagId) {
      const tag = findOneOrThrow(
        await this.prisma.tag.findUnique({ where: { id: dto.tagId } }),
        (entry) => entry.tenantId === tenantId,
        'Tag não encontrada',
      );
      return tag.id;
    }

    if (!dto.name) {
      throw new BadRequestException(
        'Informe tagId (tag existente) ou name (cria uma tag nova)',
      );
    }

    const tag = await this.tagsService.findOrCreate(
      dto.name,
      dto.color ?? 'neutral',
      tenantId,
    );
    return tag.id;
  }
}
