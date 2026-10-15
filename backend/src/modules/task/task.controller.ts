import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './create-task.dto';
import { UpdateTaskDto } from './update-task.dto';
import { Roles } from '@core/common/decorators/roles.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import type { RequestWithAuth } from '@core/common/types/http.types';

// tenantId vem do param da rota, mas é confiável: TenantMiddleware (ver
// app.module.ts) já intercepta toda rota `tenant/:tenantId/*path` e rejeita
// qualquer valor que não bata com o tenantId do JWT antes de chegar aqui.
@Controller('tenant/:tenantId/task')
@UseGuards(RolesPermissionsGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @Roles('ADMIN', 'USER')
  @Permissions('task.create')
  create(
    @Param('tenantId') tenantId: string,
    @Request() req: RequestWithAuth,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.taskService.create(tenantId, req.user!.sub, createTaskDto);
  }

  @Get()
  @Roles('ADMIN', 'USER')
  @Permissions('task.read')
  findAll(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedToUserId') assignedToUserId?: string,
  ) {
    return this.taskService.findAll(tenantId, {
      status,
      priority,
      assignedToUserId,
    });
  }

  @Get('user/:userId')
  @Roles('ADMIN', 'USER')
  @Permissions('task.read')
  getByUser(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
  ) {
    return this.taskService.getByUser(tenantId, userId);
  }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  @Permissions('task.read')
  findOne(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.taskService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'USER')
  @Permissions('task.update')
  update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.taskService.update(tenantId, id, updateTaskDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'USER')
  @Permissions('task.delete')
  remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.taskService.remove(tenantId, id);
  }
}
