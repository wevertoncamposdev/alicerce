import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { assertEntityAccess } from '@core/authorization/record-permission.util';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  // Vocabulário do tenant — sem checagem por entidade, é só a lista de
  // tags existentes pra autocomplete (ver docs/PLAN-fundacao-ux.md, U6).
  async search(query: string | undefined, tenantId: string) {
    const trimmed = query?.trim();
    return this.prisma.tag.findMany({
      where: {
        tenantId,
        ...(trimmed
          ? { name: { contains: trimmed, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }

  async create(dto: CreateTagDto, tenantId: string, userId: string) {
    await assertEntityAccess(
      this.permissionCache,
      tenantId,
      userId,
      dto.entity,
      'update',
    );

    return this.findOrCreate(dto.name, dto.color, tenantId);
  }

  async findOrCreate(name: string, color: string, tenantId: string) {
    const trimmed = name.trim();
    const existing = await this.prisma.tag.findUnique({
      where: { tenantId_name: { tenantId, name: trimmed } },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.tag.create({
      data: { tenantId, name: trimmed, color },
    });
  }
}
