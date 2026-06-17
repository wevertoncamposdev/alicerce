'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTasks } from '../hooks/use-tasks';
import { Task, TaskStatus, TaskPriority, CreateTaskInput } from '../task.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TasksFormProps {
    task?: Task;
    onSuccess?: () => void;
    isEditing?: boolean;
}

export function TasksForm({ task, onSuccess, isEditing = false }: TasksFormProps) {
    const { createTask, updateTask, saving } = useTasks();
    const [formData, setFormData] = useState({
        title: task?.title || '',
        description: task?.description || '',
        status: task?.status || TaskStatus.PENDING,
        priority: task?.priority || TaskPriority.MEDIUM,
        dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
        assignedToUserId: task?.assignedToUserId || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && task) {
                await updateTask(task.id, formData);
            } else {
                await createTask(formData);
                setFormData({
                    title: '',
                    description: '',
                    status: TaskStatus.PENDING,
                    priority: TaskPriority.MEDIUM,
                    dueDate: '',
                    assignedToUserId: '',
                });
            }
            onSuccess?.();
        } catch (err) {
            console.error('Erro ao salvar tarefa:', err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="title" className="text-sm font-medium">
                    Título *
                </label>
                <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Digite o título da tarefa"
                    required
                    disabled={saving}
                />
            </div>

            <div>
                <label htmlFor="description" className="text-sm font-medium">
                    Descrição
                </label>
                <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Digite a descrição (opcional)"
                    disabled={saving}
                    className="w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                    rows={3}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="status" className="text-sm font-medium">
                        Status
                    </label>
                    <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        disabled={saving}
                        className="w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                    >
                        {Object.values(TaskStatus).map(status => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="priority" className="text-sm font-medium">
                        Prioridade
                    </label>
                    <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        disabled={saving}
                        className="w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                    >
                        {Object.values(TaskPriority).map(priority => (
                            <option key={priority} value={priority}>
                                {priority}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label htmlFor="dueDate" className="text-sm font-medium">
                    Data de Vencimento
                </label>
                <Input
                    id="dueDate"
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    disabled={saving}
                />
            </div>

            <div>
                <label htmlFor="assignedToUserId" className="text-sm font-medium">
                    Atribuído a (ID do Usuário)
                </label>
                <Input
                    id="assignedToUserId"
                    name="assignedToUserId"
                    value={formData.assignedToUserId}
                    onChange={handleChange}
                    placeholder="ID do usuário a atribuir"
                    disabled={saving}
                />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar Tarefa'}
            </Button>
        </form>
    );
}
