'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Task, TaskStatus, TaskPriority } from '../task.types';
import { TypeView } from '@/components/TypeView';
import { Button } from '@/components/ui/button';

interface TasksTableProps {
    tasks: Task[];
    isLoading: boolean;
    onEdit?: (task: Task) => void;
    onDelete?: (id: string) => void;
}

const getStatusBadgeColor = (status: TaskStatus): string => {
    switch (status) {
        case TaskStatus.PENDING:
            return 'bg-yellow-100 text-yellow-800';
        case TaskStatus.IN_PROGRESS:
            return 'bg-blue-100 text-blue-800';
        case TaskStatus.COMPLETED:
            return 'bg-green-100 text-green-800';
        case TaskStatus.CANCELLED:
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const getPriorityBadgeColor = (priority: TaskPriority): string => {
    switch (priority) {
        case TaskPriority.LOW:
            return 'bg-green-100 text-green-800';
        case TaskPriority.MEDIUM:
            return 'bg-yellow-100 text-yellow-800';
        case TaskPriority.HIGH:
            return 'bg-orange-100 text-orange-800';
        case TaskPriority.URGENT:
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

export function TasksTable({ tasks, isLoading, onEdit, onDelete }: TasksTableProps) {
    const columns: ColumnDef<Task>[] = [
        {
            accessorKey: 'title',
            header: 'Título',
            cell: ({ row }) => <div className="font-medium">{row.original.title}</div>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(row.original.status)}`}>
                    {row.original.status}
                </span>
            ),
        },
        {
            accessorKey: 'priority',
            header: 'Prioridade',
            cell: ({ row }) => (
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${getPriorityBadgeColor(row.original.priority)}`}>
                    {row.original.priority}
                </span>
            ),
        },
        {
            accessorKey: 'creator.email',
            header: 'Criador',
            cell: ({ row }) => <div className="text-sm">{row.original.creator?.email || 'N/A'}</div>,
        },
        {
            accessorKey: 'assignedTo.email',
            header: 'Atribuído a',
            cell: ({ row }) => <div className="text-sm">{row.original.assignedTo?.email || 'Sem atribuição'}</div>,
        },
        {
            accessorKey: 'dueDate',
            header: 'Vencimento',
            cell: ({ row }) => {
                if (!row.original.dueDate) return 'Sem data';
                const date = new Date(row.original.dueDate);
                return date.toLocaleDateString('pt-BR');
            },
        },
        {
            id: 'actions',
            header: 'Ações',
            cell: ({ row }) => (
                <div className="flex gap-2">
                    {onEdit && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(row.original)}
                        >
                            Editar
                        </Button>
                    )}
                    {onDelete && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => onDelete(row.original.id)}
                        >
                            Excluir
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <TypeView
            mode="table"
            columns={columns}
            data={tasks}
            isLoading={isLoading}
            loadingMessage="Carregando tarefas..."
            emptyMessage="Nenhuma tarefa encontrada"
        />
    );
}
