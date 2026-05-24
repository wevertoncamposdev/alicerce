import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Public } from '@core/auth/auth.guard';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) { }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Criar tenant' })
  @ApiResponse({ status: 201, description: 'Tenant criado com sucesso.' })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.create(createTenantDto);
  }

  @Public()
  @Get()
  findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar tenant por id' })
  @ApiResponse({ status: 200, description: 'Tenant encontrado.' })
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar tenant' })
  @ApiResponse({ status: 200, description: 'Tenant atualizado com sucesso.' })
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar tenant' })
  @ApiResponse({ status: 200, description: 'Tenant deletado com sucesso.' })
  remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }
}
