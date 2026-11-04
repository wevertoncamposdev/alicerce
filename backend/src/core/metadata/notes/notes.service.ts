import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { assertEntityAccess } from '@core/authorization/record-permission.util';
import { findOneOrThrow } from '@core/common/utils/find-one-or-throw.util';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

const AUTHOR_SELECT = {
  select: { id: true, email: true, name: true },
} as const;

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionCache: PermissionCacheService,
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

    return this.prisma.note.findMany({
      where: { entity, entityId, tenantId },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      include: { author: AUTHOR_SELECT },
    });
  }

  async create(dto: CreateNoteDto, tenantId: string, authorId: string) {
    await assertEntityAccess(
      this.permissionCache,
      tenantId,
      authorId,
      dto.entity,
      'update',
    );

    return this.prisma.note.create({
      data: {
        tenantId,
        entity: dto.entity,
        entityId: dto.entityId,
        body: dto.body,
        authorId,
      },
      include: { author: AUTHOR_SELECT },
    });
  }

  async update(
    id: string,
    dto: UpdateNoteDto,
    tenantId: string,
    userId: string,
  ) {
    const note = await this.getNoteOrThrow(id, tenantId);
    await this.assertAuthorOrEntityUpdate(note, tenantId, userId);

    return this.prisma.note.update({
      where: { id: note.id },
      data: { ...dto },
      include: { author: AUTHOR_SELECT },
    });
  }

  async remove(id: string, tenantId: string, userId: string) {
    const note = await this.getNoteOrThrow(id, tenantId);
    await this.assertAuthorOrEntityUpdate(note, tenantId, userId);

    return this.prisma.note.delete({ where: { id: note.id } });
  }

  // Chamado pelo `remove()` de cada módulo que adota `metadata.notes` —
  // apagar o registro apaga as notas dele junto (sem FK, não tem cascade
  // automático do banco).
  async removeForRecord(entity: string, entityId: string, tenantId: string) {
    await this.prisma.note.deleteMany({
      where: { entity, entityId, tenantId },
    });
  }

  private async getNoteOrThrow(id: string, tenantId: string) {
    return findOneOrThrow(
      await this.prisma.note.findUnique({ where: { id } }),
      (note) => note.tenantId === tenantId,
      'Nota não encontrada',
    );
  }

  private async assertAuthorOrEntityUpdate(
    note: { authorId: string; entity: string },
    tenantId: string,
    userId: string,
  ) {
    if (note.authorId === userId) {
      return;
    }
    await assertEntityAccess(
      this.permissionCache,
      tenantId,
      userId,
      note.entity,
      'update',
    );
  }
}
