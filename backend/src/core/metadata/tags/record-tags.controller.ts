import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { RecordTagsService } from './record-tags.service';
import { AttachTagDto } from './dto/attach-tag.dto';

@ApiTags('record-tags')
@ApiBearerAuth()
@Controller('record-tags')
@UseGuards(RolesPermissionsGuard)
export class RecordTagsController {
  constructor(private readonly recordTagsService: RecordTagsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tags anexadas a um registro' })
  findAll(
    @Query('entity') entity: string,
    @Query('entityId', new ParseUUIDPipe()) entityId: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.recordTagsService.findAll(entity, entityId, tenantId, userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Anexar tag a um registro (cria a tag se não existir)',
  })
  attach(
    @Body() dto: AttachTagDto,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.recordTagsService.attach(dto, tenantId, userId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @ApiOperation({ summary: 'Remover tag de um registro' })
  async detach(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    await this.recordTagsService.detach(id, tenantId, userId);
  }
}
