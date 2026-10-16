// example-notes.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';
import { Roles } from '@core/common/decorators/roles.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { ExampleNotesService } from './example-notes.service';
import { CreateExampleNoteDto } from './dto/create-example-note.dto';

@ApiTags('example-notes')
@ApiBearerAuth()
@Controller('examples/:exampleId/notes')
@UseGuards(RolesPermissionsGuard)
export class ExampleNotesController {
  constructor(private readonly notesService: ExampleNotesService) {}

  @Get()
  @Roles('ADMIN', 'USER')
  @Permissions('example.read')
  @ApiOperation({ summary: 'Listar notas de um exemplo' })
  findAll(@Param('exampleId') exampleId: string, @TenantId() tenantId: string) {
    return this.notesService.findAll(exampleId, tenantId);
  }

  @Post()
  @Roles('ADMIN', 'USER')
  @Permissions('example.update')
  @ApiOperation({ summary: 'Criar nota em um exemplo' })
  create(
    @Param('exampleId') exampleId: string,
    @Body() dto: CreateExampleNoteDto,
    @TenantId() tenantId: string,
    @CurrentUserId() userSub: string,
  ) {
    return this.notesService.create(exampleId, dto, tenantId, userSub);
  }

  @Delete(':id')
  @Roles('ADMIN', 'USER')
  @Permissions('example.update')
  @ApiOperation({ summary: 'Remover nota' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.notesService.remove(id, tenantId);
  }
}
