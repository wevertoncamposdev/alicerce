// favorite-notes.controller.ts
import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';
import { FavoriteNotesService } from './favorite-notes.service';
import { CreateFavoriteNoteDto } from './dto/create-favorite-note.dto';

@ApiTags('favorite-notes')
@ApiBearerAuth()
@Controller('favorites/:favoriteId/notes')
export class FavoriteNotesController {
    constructor(private readonly notesService: FavoriteNotesService) { }

    @Get()
    @ApiOperation({ summary: 'Listar notas de um favorito' })
    findAll(@Param('favoriteId') favoriteId: string, @TenantId() tenantId: string) {
        return this.notesService.findAll(favoriteId, tenantId);
    }

    @Post()
    @ApiOperation({ summary: 'Criar nota em um favorito' })
    create(
        @Param('favoriteId') favoriteId: string,
        @Body() dto: CreateFavoriteNoteDto,
        @TenantId() tenantId: string,
        @CurrentUserId() userSub: string,
    ) {
        return this.notesService.create(favoriteId, dto, tenantId, userSub);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remover nota' })
    remove(@Param('id') id: string, @TenantId() tenantId: string) {
        return this.notesService.remove(id, tenantId);
    }
}