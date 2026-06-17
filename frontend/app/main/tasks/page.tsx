'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTasks } from '@/features/tasks/hooks/use-tasks';
import { TasksForm } from '@/features/tasks/components/TasksForm';
import { TasksTable } from '@/features/tasks/components/TasksTable';
import { Task } from '@/features/tasks/task.types';
import { DetailShell } from '@/components/shells/DetailShell';
import { SideShell } from '@/components/shells/SideShell';
import { PainelSearchShell } from '@/components/shells/PainelSearchShell';
import { Button } from '@/components/ui/button';

export default function TasksPage() {
    const { currentTenantId, hasPermission } = useAuth();
    const { tasks, loading, saving, error, deleteTask } = useTasks();
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const canCreate = hasPermission('task.create');
    const canUpdate = hasPermission('task.update');
    const canDelete = hasPermission('task.delete');

    if (!currentTenantId) {
        return (
            <DetailShell
                title="Tarefas"
                description="Gerencie as tarefas do seu tenant"
                error="Selecione um tenant antes de continuar"
            >
                <div />
            </DetailShell>
        );
    }

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
            try {
                await deleteTask(id);
            } catch (err) {
                console.error('Erro ao excluir:', err);
            }
        }
    };

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        setEditingTask(null);
    };

    return (
        <DetailShell
            title="Tarefas"
            description="Gerencie as tarefas dos usuários do seu tenant"
            error={error}
        >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {/* Formulário */}
                {(isFormOpen || editingTask) && canCreate && (
                    <SideShell
                        title={editingTask ? 'Editar Tarefa' : 'Criar Tarefa'}
                        description={editingTask ? 'Atualize os dados da tarefa' : 'Adicione uma nova tarefa'}
                    >
                        <TasksForm
                            task={editingTask || undefined}
                            isEditing={!!editingTask}
                            onSuccess={handleFormSuccess}
                        />
                        {isFormOpen && (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    setIsFormOpen(false);
                                    setEditingTask(null);
                                }}
                                disabled={saving}
                            >
                                Cancelar
                            </Button>
                        )}
                    </SideShell>
                )}

                {/* Listagem */}
                <div className="lg:col-span-2 xl:col-span-3">
                    <PainelSearchShell
                        title="Lista de Tarefas"
                        actions={
                            canCreate && !isFormOpen ? (
                                <Button onClick={() => setIsFormOpen(true)}>+ Criar Tarefa</Button>
                            ) : null
                        }
                    >
                        <TasksTable
                            tasks={tasks}
                            isLoading={loading}
                            onEdit={canUpdate ? handleEdit : undefined}
                            onDelete={canDelete ? handleDelete : undefined}
                        />
                    </PainelSearchShell>
                </div>
            </div>
        </DetailShell>
    );
}
