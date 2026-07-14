import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Search } from '@nestjs/common';
import { SearchFavoritesDto } from './dto/search-favorite.dto';
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

  @Get(':id')
  @ApiOperation({ summary: 'Obter favorito por ID' })
  @ApiResponse({ status: 200, description: 'Favorito retornado com sucesso.' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string, @CurrentUserId() userSub: string) {
    return this.favoritesService.findOne(id, tenantId, userSub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar favorito' })
  @ApiResponse({ status: 200, description: 'Favorito atualizado com sucesso.' })
  update(@Param('id') id: string, @Body() updateFavoriteDto: UpdateFavoriteDto, @TenantId() tenantId: string, @CurrentUserId() userSub: string) {
    return this.favoritesService.update(id, updateFavoriteDto, tenantId, userSub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover favorito' })
  @ApiResponse({ status: 200, description: 'Favorito removido com sucesso.' })
  remove(@Param('id') id: string, @TenantId() tenantId: string, @CurrentUserId() userSub: string) {
    return this.favoritesService.remove(id, tenantId, userSub);
  }

  @Search()
  @ApiOperation({ summary: 'Buscar favoritos' })
  @ApiResponse({ status: 200, description: 'Favoritos encontrados com sucesso.' })

  search(@Body() query: SearchFavoritesDto, @TenantId() tenantId: string, @CurrentUserId() userSub: string) {
    return this.favoritesService.search(query, tenantId, userSub);
  }

}
