import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsBoolean } from 'class-validator';
import { TaskStatus, TaskPriority } from './create-task.dto';

export class UpdateTaskDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsString()
    assignedToUserId?: string | null;

    @IsOptional()
    @IsDateString()
    completedAt?: string | null;
}
