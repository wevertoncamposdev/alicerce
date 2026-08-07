import { Injectable } from '@nestjs/common';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';
import { PrismaService } from '@src/core/prisma/prisma.service';
import { SearchFavoritesDto } from './dto/search-favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(dto: CreateFavoriteDto, tenantId: string, userSub: string) {

    const existingFavorite = await this.prisma.favorite.findFirst({
      where: {
        url: dto.url,
        title: dto.title,
        tenantId: tenantId,
        userId: userSub,
      },
    });

    if (existingFavorite) {
      return existingFavorite;
    }

    return this.prisma.favorite.create({
      data: {
        title: dto.title,
        url: dto.url,
        userId: userSub,
        tenantId: tenantId,
      },
    });
  }

  async findAll(tenantId: string, userSub: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: {
        tenantId: tenantId,
        userId: userSub,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return favorites;
  }

  async findOne(id: string, tenantId: string, userSub: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true },
        },
        tenant: {
          select: { id: true, legalName: true },
        }
      },
    });
    if (!favorite || favorite.tenantId !== tenantId || favorite.userId !== userSub) {
      throw new Error('Favorite not found or access denied');
    }
    return favorite;
  }

  async update(id: string, dto: UpdateFavoriteDto, tenantId: string, userSub: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: { id },
    });
    if (!favorite || favorite.tenantId !== tenantId || favorite.userId !== userSub) {
      throw new Error('Favorite not found or access denied');
    }

    return this.prisma.favorite.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async remove(id: string, tenantId: string, userSub: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: { id },
    });
    if (!favorite || favorite.tenantId !== tenantId || favorite.userId !== userSub) {
      throw new Error('Favorite not found or access denied');
    }
    return this.prisma.favorite.delete({
      where: { id },
    });

  }

  async search(query: SearchFavoritesDto, tenantId: string, userSub: string) {
    const page = query.pagination?.pageIndex !== undefined ? query.pagination.pageIndex + 1 : 1;
    const limit = query.pagination?.pageSize ?? 20;

    const where = {
      tenantId,
      userId: userSub,
      ...(query.searchText
        ? {
          OR: [
            { title: { contains: query.searchText, mode: "insensitive" as const } },
            { url: { contains: query.searchText, mode: "insensitive" as const } },
          ],
        }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.favorite.count({ where }),
    ]);

    return { items, total, page, limit };
  }


}
