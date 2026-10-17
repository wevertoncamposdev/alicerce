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
import { SearchFeedbacksDto } from './dto/search-feedback.dto';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';
import { Roles } from '@core/common/decorators/roles.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { FeedbacksService } from './feedbacks.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';

@Controller('feedbacks')
@UseGuards(RolesPermissionsGuard)
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

  @Post()
  @Roles('ADMIN', 'USER')
  @Permissions('feedback.create')
  create(
    @Body() dto: CreateFeedbackDto,
    @TenantId() tenantId: string,
    @CurrentUserId() userSub: string,
  ) {
    return this.feedbacksService.create(dto, tenantId, userSub);
  }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  @Permissions('feedback.read')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.feedbacksService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'USER')
  @Permissions('feedback.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackDto,
    @TenantId() tenantId: string,
  ) {
    return this.feedbacksService.update(id, dto, tenantId);
  }

  // Rota própria, permissão própria — garante que trocar o status exige
  // `feedback.manage` mesmo que alguém chame a API direto (nunca só
  // esconder o controle no frontend).
  @Patch(':id/status')
  @Roles('ADMIN', 'USER')
  @Permissions('feedback.manage')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
    @TenantId() tenantId: string,
  ) {
    return this.feedbacksService.updateStatus(id, dto.status, tenantId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'USER')
  @Permissions('feedback.delete')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.feedbacksService.remove(id, tenantId);
  }

  @Search()
  @Roles('ADMIN', 'USER')
  @Permissions('feedback.read')
  search(@Body() query: SearchFeedbacksDto, @TenantId() tenantId: string) {
    return this.feedbacksService.search(query, tenantId);
  }
}
