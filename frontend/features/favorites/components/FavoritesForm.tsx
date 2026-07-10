'use client';
/**
 * FavoritesForm component 
 * inputs for title and url, and a submit button to add a favorite.
 */
import { useActionState } from 'react';
import { Button, Input } from '@/components/ui/index';
import { favorites } from '../actions/favorites.action';

const initialState = { error: null as string | null };

export function FavoritesForm() {
    const [state, formAction, isPending] = useActionState(favorites, initialState);
    
    return(
        <form action={formAction} className="space-y-4">
            <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium text-zinc-700">   
                    Título
                </label>
                <Input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="Título do favorito"
                    required
                    disabled={isPending}
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="url" className="text-sm font-medium text-zinc-700">
                    URL
                </label>
                <Input
                    id="url"
                    name="url"
                    type="url"
                    placeholder="https://exemplo.com"
                    required
                    disabled={isPending}
                />
            </div>
            {state.error ? (
                <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {state.error}
                </div>
            ) : null}
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Salvando..." : "Salvar"}
            </Button>
        </form> 
    )
}
