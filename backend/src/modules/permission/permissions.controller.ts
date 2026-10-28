import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Search,
} from '@nestjs/common';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { UseGuards } from '@nestjs/common';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { PermissionsService } from './permissions.service';
import { SearchPermissionDto } from './dto/search-permission.dto';

@ApiTags('permissions')
@Controller('permissions')
@UseGuards(RolesPermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions('permission.read')
  findAll(@TenantId() tenantId: string) {
    return this.permissionsService.findAll(tenantId);
  }

  @Get(':id')
  @Permissions('permission.read')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.permissionsService.findOne(id, tenantId);
  }

  @Search()
  @Permissions('permission.read')
  @ApiOperation({ summary: 'Search permissions' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiBody({ schema: { type: 'object' } })
  search(@Body() query: SearchPermissionDto, @TenantId() tenantId: string) {
    return this.permissionsService.search(query, tenantId);
  }

  //Roles

  @Get(':id/roles')
  @Permissions('permission.read')
  listRoles(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.permissionsService.findRolesOfPermission(id, tenantId);
  }
}
