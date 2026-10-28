'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button, Input } from '@components/ui/index';
import { requestPasswordReset } from '@lib/auth-forgot-password';

const initialState = { error: null as string | null, success: false };

export function ForgotPasswordForm() {
    const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);

    if (state.success) {
        return (
            <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
                Se o e-mail existir, enviamos um link de redefinição. Confira sua caixa de entrada.
            </div>
        );
    }

    return (
        <>
            <form action={formAction} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                        E-mail
                    </label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="voce@exemplo.com"
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
                    {isPending ? 'Enviando...' : 'Enviar link de redefinição'}
                </Button>
            </form>

            <div className="mt-6 border-t pt-4">
                <p className="text-center text-sm text-zinc-600">
                    <Link href="/auth/login" className="font-medium text-zinc-900 hover:underline">
                        Voltar para o login
                    </Link>
                </p>
            </div>
        </>
    );
}
