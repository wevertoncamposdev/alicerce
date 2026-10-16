import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Search,
} from '@nestjs/common';
import { SearchExamplesDto } from './dto/search-example.dto';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { Roles } from '@core/common/decorators/roles.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { ExamplesService } from './examples.service';
import { CreateExampleDto } from './dto/create-example.dto';
import { UpdateExampleDto } from './dto/update-example.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';

@ApiTags('examples')
@ApiBearerAuth()
@Controller('examples')
@UseGuards(RolesPermissionsGuard)
export class ExamplesController {
  constructor(private readonly examplesService: ExamplesService) {}

  @Post()
  @Roles('ADMIN', 'USER')
  @Permissions('example.create')
  @ApiOperation({ summary: 'Criar exemplo' })
  @ApiResponse({ status: 201, description: 'Exemplo criado com sucesso.' })
  create(
    @Body() createExampleDto: CreateExampleDto,
    @TenantId() tenantId: string,
    @CurrentUserId() userSub: string,
  ) {
    return this.examplesService.create(createExampleDto, tenantId, userSub);
  }

  @Get()
  @Roles('ADMIN', 'USER')
  @Permissions('example.read')
  @ApiOperation({ summary: 'Listar exemplos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de exemplos retornada com sucesso.',
  })
  findAll(@TenantId() tenantId: string, @CurrentUserId() userSub: string) {
    return this.examplesService.findAll(tenantId, userSub);
  }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  @Permissions('example.read')
  @ApiOperation({ summary: 'Obter exemplo por ID' })
  @ApiResponse({ status: 200, description: 'Exemplo retornado com sucesso.' })
  findOne(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userSub: string,
  ) {
    return this.examplesService.findOne(id, tenantId, userSub);
  }

  @Patch(':id')
  @Roles('ADMIN', 'USER')
  @Permissions('example.update')
  @ApiOperation({ summary: 'Atualizar exemplo' })
  @ApiResponse({ status: 200, description: 'Exemplo atualizado com sucesso.' })
  update(
    @Param('id') id: string,
    @Body() updateExampleDto: UpdateExampleDto,
    @TenantId() tenantId: string,
    @CurrentUserId() userSub: string,
  ) {
    return this.examplesService.update(id, updateExampleDto, tenantId, userSub);
  }

  @Delete(':id')
  @Roles('ADMIN', 'USER')
  @Permissions('example.delete')
  @ApiOperation({ summary: 'Remover exemplo' })
  @ApiResponse({ status: 200, description: 'Exemplo removido com sucesso.' })
  remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userSub: string,
  ) {
    return this.examplesService.remove(id, tenantId, userSub);
  }

  @Search()
  @Roles('ADMIN', 'USER')
  @Permissions('example.read')
  @ApiOperation({ summary: 'Buscar exemplos' })
  @ApiResponse({
    status: 200,
    description: 'Exemplos encontrados com sucesso.',
  })
  search(
    @Body() query: SearchExamplesDto,
    @TenantId() tenantId: string,
    @CurrentUserId() userSub: string,
  ) {
    return this.examplesService.search(query, tenantId, userSub);
  }
}
