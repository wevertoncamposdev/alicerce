'use client';

import { updateFavorite } from '../actions/actions';
import { useActionState } from 'react';
import { Favorite } from '../favorite.types';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState = { ok: true, message: '' };

export function FavoriteUpdateForm({ favorite }: { favorite: Favorite }) {
    const [state, formAction, isPending] = useActionState(
        updateFavorite.bind(null, favorite.id),
        initialState
    );

    return (
        <form action={formAction} className="space-y-4">
            <Input name="title" defaultValue={favorite.title} placeholder="Título" className='border p-2 w-full' />
            <Input name="url" defaultValue={favorite.url} placeholder="URL" className='border p-2 w-full' />
            <Button type="submit" disabled={isPending}>
                {isPending ? 'Atualizando...' : 'Atualizar'}
            </Button>
            {state.message && <p className='text-green-500'>{state.message}</p>}
        </form>
    )
}