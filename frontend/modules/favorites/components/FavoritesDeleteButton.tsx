'use client';
import { useTransition } from 'react';
import { Button } from '@components/ui/button';
import { deleteFavorite } from '../actions/actions';

interface FavoritesDeleteButtonProps {
    id: string;
}

/**
 * Botão de exclusão isolado para não forçar o FavoritesList inteiro
 * a ter um isPending global. Cada item gerencia seu próprio estado.
 */
export function FavoritesDeleteButton({ id }: FavoritesDeleteButtonProps) {
    const [isPending, startTransition] = useTransition();

    function handleDelete() {
        startTransition(async () => {
            await deleteFavorite(id);
        });
    }

    return (
        <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={handleDelete}
        >
            {isPending ? 'Removendo...' : 'Remover'}
        </Button>
    );
}