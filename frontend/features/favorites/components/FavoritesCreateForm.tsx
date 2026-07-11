'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createFavorite } from '../actions/favorites.actions';
import { FAVORITE_INITIAL_STATE } from '../favorite.constants';
import { FavoritesFields } from './FavoritesFields';

/**
 * Formulário de criação de favorito.
 * Usa useActionState com createFavorite — sem estado manual de loading ou erro.
 */
export function FavoritesCreateForm() {
    const [state, formAction, isPending] = useActionState(
        createFavorite,
        FAVORITE_INITIAL_STATE,
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Novo favorito</CardTitle>
            </CardHeader>

            <CardContent>
                <form action={formAction} className="space-y-4">
                    <FavoritesFields disabled={isPending} />

                    {state.error ? (
                        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {state.error}
                        </div>
                    ) : null}

                    <Button type="submit" disabled={isPending} className="w-full">
                        {isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
