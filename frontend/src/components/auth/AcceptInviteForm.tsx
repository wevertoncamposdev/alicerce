'use client';

import { useActionState } from 'react';
import { Button, Input } from '@components/ui/index';
import { acceptInviteWithToken } from '@lib/auth-accept-invite';

const initialState = { error: null as string | null };

export function AcceptInviteForm({ token }: { token: string }) {
    const [state, formAction, isPending] = useActionState(acceptInviteWithToken, initialState);

    return (
        <form action={formAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />

            <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-zinc-700">
                    Defina sua senha
                </label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Sua senha"
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
                {isPending ? 'Aceitando convite...' : 'Aceitar convite'}
            </Button>
        </form>
    );
}
