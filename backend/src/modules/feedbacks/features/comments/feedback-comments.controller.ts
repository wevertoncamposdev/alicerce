import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { FeedbackCommentsService } from './feedback-comments.service';
import { CreateFeedbackCommentDto } from './dto/create-feedback-comment.dto';

@ApiTags('feedback-comments')
@ApiBearerAuth()
@Controller('feedbacks/:feedbackId/comments')
@UseGuards(RolesPermissionsGuard)
export class FeedbackCommentsController {
  constructor(private readonly commentsService: FeedbackCommentsService) {}

  @Get()
  @Permissions('feedback.read')
  @ApiOperation({ summary: 'Listar comentários de um feedback' })
  findAll(
    @Param('feedbackId', new ParseUUIDPipe()) feedbackId: string,
    @TenantId() tenantId: string,
  ) {
    return this.commentsService.findAll(feedbackId, tenantId);
  }

  @Post()
  @Permissions('feedback.update')
  @ApiOperation({ summary: 'Comentar em um feedback' })
  create(
    @Param('feedbackId', new ParseUUIDPipe()) feedbackId: string,
    @Body() dto: CreateFeedbackCommentDto,
    @TenantId() tenantId: string,
    @CurrentUserId() userSub: string,
  ) {
    return this.commentsService.create(feedbackId, dto, tenantId, userSub);
  }

  @Delete(':id')
  @Permissions('feedback.update')
  @ApiOperation({ summary: 'Remover comentário' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.commentsService.remove(id, tenantId);
  }
}
