import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';

// Vocabulário de tags do tenant — ver nota em `TagsService.search`.
@ApiTags('tags')
@ApiBearerAuth()
@Controller('tags')
@UseGuards(RolesPermissionsGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar tags do tenant (autocomplete)' })
  search(
    @Query('search') search: string | undefined,
    @TenantId() tenantId: string,
  ) {
    return this.tagsService.search(search, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar tag nova no tenant' })
  create(
    @Body() dto: CreateTagDto,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.tagsService.create(dto, tenantId, userId);
  }
}
