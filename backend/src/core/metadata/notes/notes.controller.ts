import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

// Sem `@Permissions` estático — a permissão é herdada do registro
// (`entity`), resolvida em runtime dentro do service (ver
// `core/authorization/record-permission.util.ts`). `RolesPermissionsGuard`
// ainda roda, só não exige nenhuma permissão fixa aqui.
@ApiTags('notes')
@ApiBearerAuth()
@Controller('notes')
@UseGuards(RolesPermissionsGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notas de um registro' })
  findAll(
    @Query('entity') entity: string,
    @Query('entityId', new ParseUUIDPipe()) entityId: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.notesService.findAll(entity, entityId, tenantId, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar nota em um registro' })
  create(
    @Body() dto: CreateNoteDto,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.notesService.create(dto, tenantId, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar nota (autor ou quem pode alterar o registro)',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateNoteDto,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.notesService.update(id, dto, tenantId, userId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @ApiOperation({
    summary: 'Remover nota (autor ou quem pode alterar o registro)',
  })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    await this.notesService.remove(id, tenantId, userId);
  }
}
