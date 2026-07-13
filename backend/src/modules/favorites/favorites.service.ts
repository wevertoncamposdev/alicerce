import { Injectable } from '@nestjs/common';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';
import { PrismaService } from '@src/core/prisma/prisma.service';

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

}
