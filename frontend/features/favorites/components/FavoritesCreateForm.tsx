'use client';

import { createFavorite } from '../actions/actions';
import { useActionState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState = { ok: true, message: '' };

export function FavoriteCreateForm() {
    const [state, formAction, isPending] = useActionState(createFavorite, initialState);

    return (
        <form action={formAction}>
            <Input name="title" placeholder="Título" />
            <Input name="url" placeholder="URL" />
            <Button type="submit" disabled={isPending}>
                {isPending ? 'Criando...' : 'Criar'}
            </Button>
            {state.message && <p>{state.message}</p>}
        </form>
    )
}