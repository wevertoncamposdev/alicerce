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
import { AuthGuard } from '../../core/auth/auth.guard';

@Controller('tenant/:tenantId/task')
@UseGuards(AuthGuard)
export class TaskController {
    constructor(private readonly taskService: TaskService) { }

    @Post()
    create(@Param('tenantId') tenantId: string, @Request() req, @Body() createTaskDto: CreateTaskDto) {
        return this.taskService.create(tenantId, req.user.id, createTaskDto);
    }

    @Get()
    findAll(
        @Param('tenantId') tenantId: string,
        @Query('status') status?: string,
        @Query('priority') priority?: string,
        @Query('assignedToUserId') assignedToUserId?: string,
    ) {
        return this.taskService.findAll(tenantId, { status, priority, assignedToUserId });
    }

    @Get('user/:userId')
    getByUser(@Param('tenantId') tenantId: string, @Param('userId') userId: string) {
        return this.taskService.getByUser(tenantId, userId);
    }

    @Get(':id')
    findOne(@Param('tenantId') tenantId: string, @Param('id') id: string) {
        return this.taskService.findOne(tenantId, id);
    }

    @Patch(':id')
    update(
        @Param('tenantId') tenantId: string,
        @Param('id') id: string,
        @Body() updateTaskDto: UpdateTaskDto,
    ) {
        return this.taskService.update(tenantId, id, updateTaskDto);
    }

    @Delete(':id')
    remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
        return this.taskService.remove(tenantId, id);
    }
}
