import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateTaskDto } from './create-task.dto';
import { UpdateTaskDto } from './update-task.dto';
import { TaskStatus, TaskPriority } from './create-task.dto';
import type { Task } from '../../core/prisma/generated/client';

@Injectable()
export class TaskService {
    constructor(private readonly prisma: PrismaService) { }

    async create(tenantId: string, userId: string, dto: CreateTaskDto): Promise<Task> {
        return this.prisma.task.create({
            data: {
                tenantId,
                userId,
                title: dto.title,
                description: dto.description,
                status: dto.status,
                priority: dto.priority,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                assignedToUserId: dto.assignedToUserId,
            },
            include: {
                creator: { select: { id: true, email: true } },
                assignedTo: { select: { id: true, email: true } },
            },
        });
    }

    async findAll(tenantId: string, filters?: { status?: string; priority?: string; assignedToUserId?: string }) {
        return this.prisma.task.findMany({
            where: {
                tenantId,
                status: filters?.status ? (filters.status as TaskStatus) : undefined,
                priority: filters?.priority ? (filters.priority as TaskPriority) : undefined,
                assignedToUserId: filters?.assignedToUserId ? filters.assignedToUserId : undefined,
                deletedAt: null,
            },
            include: {
                creator: { select: { id: true, email: true } },
                assignedTo: { select: { id: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(tenantId: string, id: string): Promise<Task> {
        const task = await this.prisma.task.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                creator: { select: { id: true, email: true } },
                assignedTo: { select: { id: true, email: true } },
            },
        });

        if (!task) {
            throw new NotFoundException('Tarefa não encontrada');
        }

        return task;
    }

    async update(tenantId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
        await this.findOne(tenantId, id);

        return this.prisma.task.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                status: dto.status,
                priority: dto.priority,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
                assignedToUserId: dto.assignedToUserId,
                completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
            },
            include: {
                creator: { select: { id: true, email: true } },
                assignedTo: { select: { id: true, email: true } },
            },
        });
    }

    async remove(tenantId: string, id: string): Promise<Task> {
        await this.findOne(tenantId, id);

        return this.prisma.task.update({
            where: { id },
            data: { deletedAt: new Date() },
            include: {
                creator: { select: { id: true, email: true } },
                assignedTo: { select: { id: true, email: true } },
            },
        });
    }

    async getByUser(tenantId: string, userId: string) {
        return this.prisma.task.findMany({
            where: {
                tenantId,
                OR: [{ userId }, { assignedToUserId: userId }],
                deletedAt: null,
            },
            include: {
                creator: { select: { id: true, email: true } },
                assignedTo: { select: { id: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
