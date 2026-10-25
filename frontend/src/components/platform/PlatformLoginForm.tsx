'use client';

import { useActionState } from 'react';
import { Button, Input } from '@components/ui/index';
import { platformLogin } from '@lib/platform-login';

const initialState = { error: null as string | null };

export function PlatformLoginForm() {
    const [state, formAction, isPending] = useActionState(platformLogin, initialState);

    return (
        <form action={formAction} className="space-y-4">
            <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                    E-mail
                </label>
                <Input id="email" name="email" type="email" required disabled={isPending} />
            </div>

            <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-zinc-700">
                    Senha
                </label>
                <Input id="password" name="password" type="password" required disabled={isPending} />
            </div>

            {state.error ? (
                <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {state.error}
                </div>
            ) : null}

            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? 'Entrando...' : 'Entrar'}
            </Button>
        </form>
    );
}
