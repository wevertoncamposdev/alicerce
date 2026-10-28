'use client';

import { useActionState } from 'react';
import { Button, Input } from '@components/ui/index';
import { resetPasswordWithToken } from '@lib/auth-reset-password';

const initialState = { error: null as string | null };

export function ResetPasswordForm({ token }: { token: string }) {
    const [state, formAction, isPending] = useActionState(resetPasswordWithToken, initialState);

    return (
        <form action={formAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />

            <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-zinc-700">
                    Nova senha
                </label>
                <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="Sua nova senha"
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
                {isPending ? 'Redefinindo...' : 'Redefinir senha'}
            </Button>
        </form>
    );
}
