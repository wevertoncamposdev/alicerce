import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';


@ApiTags('favorites')
@ApiBearerAuth()
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) { }

  @Post()
  @ApiOperation({ summary: 'Criar favorito' })
  @ApiResponse({ status: 201, description: 'Favorito criado com sucesso.' })
  create(@Body() createFavoriteDto: CreateFavoriteDto, @TenantId() tenantId: string, @CurrentUserId() userSub: string) {
    return this.favoritesService.create(createFavoriteDto, tenantId, userSub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar favoritos' })
  @ApiResponse({ status: 200, description: 'Lista de favoritos retornada com sucesso.' })
  findAll(@TenantId() tenantId: string, @CurrentUserId() userSub: string) {
    return this.favoritesService.findAll(tenantId, userSub);
  }

}
