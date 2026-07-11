'use client';
import { useMemo, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { updateFavorite } from '../actions/favorites.actions';
import { FAVORITE_INITIAL_STATE } from '../favorite.constants';
import { FavoriteEntity } from '../favorite.types';
import { FavoritesFields } from './FavoritesFields';

interface FavoritesEditFormProps {
    favorite: FavoriteEntity;
    onCancel: () => void;
}

/**
 * Formulário de edição de um favorito existente.
 *
 * O truque central: updateFavorite espera (id, _prev, formData), mas
 * useActionState só passa (_prev, formData). O .bind(null, favorite.id)
 * "pré-preenche" o primeiro argumento, tornando a assinatura compatível.
 *
 * O useMemo garante que o bind não recria uma nova referência a cada render.
 */
export function FavoritesEditForm({ favorite, onCancel }: FavoritesEditFormProps) {
    const boundAction = useMemo(
        () => updateFavorite.bind(null, favorite.id),
        [favorite.id],
    );

    const [state, formAction, isPending] = useActionState(
        boundAction,
        FAVORITE_INITIAL_STATE,
    );

    return (
        <form action={formAction} className="space-y-4">
            <FavoritesFields
                defaultTitle={favorite.title}
                defaultUrl={favorite.url}
                disabled={isPending}
            />

            {state.error ? (
                <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {state.error}
                </div>
            ) : null}

            <div className="flex gap-2">
                <Button type="submit" disabled={isPending} className="flex-1">
                    {isPending ? 'Salvando...' : 'Salvar alterações'}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={onCancel}
                >
                    Cancelar
                </Button>
            </div>
        </form>
    );
}
