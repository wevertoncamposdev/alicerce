'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/api-client';
import { Task, CreateTaskInput, UpdateTaskInput } from '../task.types';

interface UseTasks {
    tasks: Task[];
    loading: boolean;
    saving: boolean;
    error: string | null;
    reload: () => Promise<void>;
    createTask: (data: CreateTaskInput) => Promise<Task>;
    updateTask: (id: string, data: UpdateTaskInput) => Promise<Task>;
    deleteTask: (id: string) => Promise<void>;
}

export function useTasks(): UseTasks {
    const { token, currentTenantId } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!token || !currentTenantId) {
            setTasks([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await apiRequest<Task[]>(
                `/tenant/${currentTenantId}/task`,
                {
                    method: 'GET',
                    token,
                    tenantId: currentTenantId,
                }
            );
            setTasks(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas');
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }, [token, currentTenantId]);

    const createTask = useCallback(
        async (data: CreateTaskInput): Promise<Task> => {
            if (!token || !currentTenantId) {
                throw new Error('Token ou Tenant não disponível');
            }

            try {
                setSaving(true);
                setError(null);
                const result = await apiRequest<Task>(
                    `/tenant/${currentTenantId}/task`,
                    {
                        method: 'POST',
                        token,
                        tenantId: currentTenantId,
                        body: data,
                    }
                );
                await load();
                return result;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Erro ao criar tarefa';
                setError(message);
                throw err;
            } finally {
                setSaving(false);
            }
        },
        [token, currentTenantId, load]
    );

    const updateTask = useCallback(
        async (id: string, data: UpdateTaskInput): Promise<Task> => {
            if (!token || !currentTenantId) {
                throw new Error('Token ou Tenant não disponível');
            }

            try {
                setSaving(true);
                setError(null);
                const result = await apiRequest<Task>(
                    `/tenant/${currentTenantId}/task/${id}`,
                    {
                        method: 'PATCH',
                        token,
                        tenantId: currentTenantId,
                        body: data,
                    }
                );
                await load();
                return result;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Erro ao atualizar tarefa';
                setError(message);
                throw err;
            } finally {
                setSaving(false);
            }
        },
        [token, currentTenantId, load]
    );

    const deleteTask = useCallback(
        async (id: string): Promise<void> => {
            if (!token || !currentTenantId) {
                throw new Error('Token ou Tenant não disponível');
            }

            try {
                setSaving(true);
                setError(null);
                await apiRequest(
                    `/tenant/${currentTenantId}/task/${id}`,
                    {
                        method: 'DELETE',
                        token,
                        tenantId: currentTenantId,
                    }
                );
                await load();
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Erro ao excluir tarefa';
                setError(message);
                throw err;
            } finally {
                setSaving(false);
            }
        },
        [token, currentTenantId, load]
    );

    useEffect(() => {
        void load();
    }, [load]);

    return {
        tasks,
        loading,
        saving,
        error,
        reload: load,
        createTask,
        updateTask,
        deleteTask,
    };
}
