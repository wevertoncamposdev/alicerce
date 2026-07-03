import { Injectable } from '@nestjs/common';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';
import { PrismaService } from '@src/core/prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(dto: CreateFavoriteDto) {
    const data = dto;

    const existingFavorite = await this.prisma.favorite.findFirst({
      where: {
        url: dto.url,
        userId: dto.userId,
      },
    });

    if (existingFavorite) {
      return existingFavorite;
    }

    return this.prisma.favorite.create({
      data: {
        title: dto.title,
        url: dto.url,
        userId: dto.userId,
        tenantId: dto.tenantId,
      },
    });
  }

  async findAll() {
    const favorites = await this.prisma.favorite.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return favorites;
  }

}
